use rbx_dom_weak::types::Variant;
use rbx_dom_weak::WeakDom;
use serde::Serialize;
use specta::Type;

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

#[derive(Serialize, Clone, Type)]
pub struct RobloxKeyframe {
    pub time: f32,
    pub poses: Vec<RobloxPose>,
}

#[derive(Serialize, Clone, Type)]
pub struct RobloxAnimationClip {
    pub loop_anim: bool, // Note: output needs to map this properly in frontend or here. We will just use loop in TS.
    #[serde(rename = "loop")]
    pub loop_flag: bool,
    pub priority: i32,
    pub duration: f32,
    pub keyframes: Vec<RobloxKeyframe>,
}

fn parse_poses(dom: &WeakDom, referent: rbx_dom_weak::types::Ref) -> Vec<RobloxPose> {
    let mut poses = Vec::new();
    let instance = dom.get_by_ref(referent).expect("referent should exist in DOM");

    for child_ref in instance.children() {
        let child = dom.get_by_ref(*child_ref).expect("child referent should exist in DOM");
        if child.class == "Pose" {
            let name = child.name.clone();
            let mut position = [0.0; 3];
            let mut rotation = [1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0];
            let mut easing_style = 0;
            let mut easing_direction = 0;

            if let Some(Variant::CFrame(cf)) =
                child.properties.iter().find(|(k, _)| k.as_str() == "CFrame").map(|(_, v)| v)
            {
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

            if let Some(Variant::Enum(style)) =
                child.properties.iter().find(|(k, _)| k.as_str() == "EasingStyle").map(|(_, v)| v)
            {
                easing_style = style.to_u32() as i32;
            }
            if let Some(Variant::Enum(dir)) = child
                .properties
                .iter()
                .find(|(k, _)| k.as_str() == "EasingDirection")
                .map(|(_, v)| v)
            {
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
    }
    poses
}

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

    // Find KeyframeSequence
    let mut kfs_ref = None;
    for child in root.children() {
        let instance = dom.get_by_ref(*child).expect("child should exist");
        if instance.class == "KeyframeSequence" {
            kfs_ref = Some(*child);
            break;
        } else {
            // Search one more layer deep just in case it's wrapped in a model
            for inner_child in instance.children() {
                let inner_instance = dom.get_by_ref(*inner_child).expect("inner child should exist");
                if inner_instance.class == "KeyframeSequence" {
                    kfs_ref = Some(*inner_child);
                    break;
                }
            }
        }
        if kfs_ref.is_some() {
            break;
        }
    }

    let Some(kfs_ref) = kfs_ref else {
        return Ok(None);
    };

    let kfs_instance = dom.get_by_ref(kfs_ref).expect("kfs referent should exist in DOM");
    let mut loop_flag = false;
    let mut priority = 2; // Core

    if let Some(Variant::Bool(l)) =
        kfs_instance.properties.iter().find(|(k, _)| k.as_str() == "Loop").map(|(_, v)| v)
    {
        loop_flag = *l;
    }

    if let Some(Variant::Enum(p)) =
        kfs_instance.properties.iter().find(|(k, _)| k.as_str() == "Priority").map(|(_, v)| v)
    {
        priority = p.to_u32() as i32;
    }

    let mut keyframes = Vec::new();

    for child_ref in kfs_instance.children() {
        let child = dom.get_by_ref(*child_ref).expect("child referent should exist");
        if child.class == "Keyframe" {
            let mut time = 0.0;
            if let Some(Variant::Float32(t)) =
                child.properties.iter().find(|(k, _)| k.as_str() == "Time").map(|(_, v)| v)
            {
                time = *t;
            }

            keyframes.push(RobloxKeyframe { time, poses: parse_poses(&dom, *child_ref) });
        }
    }

    keyframes.sort_by(|a, b| a.time.partial_cmp(&b.time).unwrap_or(std::cmp::Ordering::Equal));

    let duration = keyframes.last().map(|k| k.time).unwrap_or(0.0);

    Ok(Some(RobloxAnimationClip { loop_anim: loop_flag, loop_flag, priority, duration, keyframes }))
}
