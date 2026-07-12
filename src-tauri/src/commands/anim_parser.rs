//! Parses Roblox XML animation data into a structured JSON payload for the UI.
//!
//! Because animations are stored as a complex tree of Poses inside Keyframes,
//! we traverse the `rbx_dom_weak` XML tree and convert the CFrames and EasingStyles
//! into a clean, flat format the React frontend can consume for the 3D viewer.

use rbx_dom_weak::types::Variant;
use rbx_dom_weak::WeakDom;
use serde::Serialize;
use specta::Type;

/// Represents a single joint/bone's transform at a specific point in time.
#[derive(Serialize, Clone, Type)]
pub struct RobloxPose {
    pub name: String,
    pub position: [f32; 3],
    pub rotation: [f32; 9],
    pub children: Vec<RobloxPose>,
    #[serde(rename = "easingStyle")]
    pub easing_style: i32,
    #[serde(rename = "easingDirection")]
    pub easing_direction: i32,
}

/// A specific moment in time within an animation clip.
#[derive(Serialize, Clone, Type)]
pub struct RobloxKeyframe {
    pub time: f32,
    pub poses: Vec<RobloxPose>,
}

/// The root structure of a Roblox animation containing all keyframes.
#[derive(Serialize, Clone, Type)]
pub struct RobloxAnimationClip {
    #[serde(rename = "loop")]
    pub loop_flag: bool,
    pub priority: i32,
    pub duration: f32,
    pub keyframes: Vec<RobloxKeyframe>,
}

fn get_prop<'a>(instance: &'a rbx_dom_weak::Instance, key: &str) -> Option<&'a Variant> {
    instance.properties.iter().find(|(k, _)| k.as_str() == key).map(|(_, v)| v)
}

/// Recursively parses child `Pose` nodes into `RobloxPose` structs.
fn parse_poses(dom: &WeakDom, referent: rbx_dom_weak::types::Ref) -> Vec<RobloxPose> {
    let Some(instance) = dom.get_by_ref(referent) else {
        return vec![];
    };

    let mut poses = Vec::new();

    for child_ref in instance.children() {
        let Some(child) = dom.get_by_ref(*child_ref) else {
            continue;
        };
        if child.class != "Pose" {
            continue;
        }

        let name = child.name.clone();
        let mut position = [0.0; 3];
        let mut rotation = [1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0];
        let mut easing_style = 0;
        let mut easing_direction = 0;

        if let Some(Variant::CFrame(cf)) = get_prop(child, "CFrame") {
            position = [cf.position.x, cf.position.y, cf.position.z];
            rotation = [
                cf.orientation.x.x,
                cf.orientation.x.y,
                cf.orientation.x.z,
                cf.orientation.y.x,
                cf.orientation.y.y,
                cf.orientation.y.z,
                cf.orientation.z.x,
                cf.orientation.z.y,
                cf.orientation.z.z,
            ];
        }

        if let Some(Variant::Enum(style)) = get_prop(child, "EasingStyle") {
            easing_style = style.to_u32() as i32;
        }
        if let Some(Variant::Enum(dir)) = get_prop(child, "EasingDirection") {
            easing_direction = dir.to_u32() as i32;
        }

        poses.push(RobloxPose {
            name,
            position,
            rotation,
            easing_style,
            easing_direction,
            children: parse_poses(dom, *child_ref),
        });
    }
    poses
}

/// Takes raw Roblox XML (`<roblox!>...`) containing a `KeyframeSequence`
/// and converts it into a `RobloxAnimationClip` for the frontend.
#[tauri::command]
#[specta::specta]
pub fn parse_animation_data(xml: String) -> Result<Option<RobloxAnimationClip>, String> {
    if xml.trim().is_empty() {
        return Ok(None);
    }

    let Ok(dom) = rbx_xml::from_str_default(&xml) else {
        return Ok(None);
    };

    let root = dom.root();

    // Find KeyframeSequence, searching one level deep in case it's wrapped.
    let mut kfs_ref = None;
    'outer: for child in root.children() {
        let Some(instance) = dom.get_by_ref(*child) else {
            continue;
        };
        if instance.class == "KeyframeSequence" {
            kfs_ref = Some(*child);
            break;
        }
        for inner_child in instance.children() {
            let Some(inner) = dom.get_by_ref(*inner_child) else {
                continue;
            };
            if inner.class == "KeyframeSequence" {
                kfs_ref = Some(*inner_child);
                break 'outer;
            }
        }
    }

    let Some(kfs_ref) = kfs_ref else {
        return Ok(None);
    };

    let Some(kfs_instance) = dom.get_by_ref(kfs_ref) else {
        return Ok(None);
    };

    let mut loop_flag = false;
    let mut priority = 2; // Core

    if let Some(Variant::Bool(l)) = get_prop(kfs_instance, "Loop") {
        loop_flag = *l;
    }
    if let Some(Variant::Enum(p)) = get_prop(kfs_instance, "Priority") {
        priority = p.to_u32() as i32;
    }

    let mut keyframes = Vec::new();

    for child_ref in kfs_instance.children() {
        let Some(child) = dom.get_by_ref(*child_ref) else {
            continue;
        };
        if child.class == "Keyframe" {
            let mut time = 0.0;
            if let Some(Variant::Float32(t)) = get_prop(child, "Time") {
                time = *t;
            }
            keyframes.push(RobloxKeyframe { time, poses: parse_poses(&dom, *child_ref) });
        }
    }

    keyframes.sort_by(|a, b| a.time.partial_cmp(&b.time).unwrap_or(std::cmp::Ordering::Equal));
    let duration = keyframes.last().map(|k| k.time).unwrap_or(0.0);

    Ok(Some(RobloxAnimationClip { loop_flag, priority, duration, keyframes }))
}
