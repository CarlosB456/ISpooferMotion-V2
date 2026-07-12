--!nocheck
--!nolint
-- luacheck: ignore
---@diagnostic disable: undefined-global, unused-local, unused-function, lowercase-global
--- MeshPart replacement logic.
---
--- MeshParts cannot have their MeshId changed at runtime. To spoof them, we have to
--- create an entirely new MeshPart (or a fallback Part with a SpecialMesh), copy all
--- the properties over, move all children and joints, and then destroy the original.

--- Copies all visual, physical, and behavioral properties from one part to another.
local function copyMeshPartPropertiesInto(src: MeshPart, dst: BasePart, overrideTextureId: string?)
	pcall(function()
		dst.Name = src.Name
		dst.CFrame = src.CFrame
		dst.Size = src.Size
		dst.Anchored = src.Anchored
		dst.Archivable = src.Archivable
		dst.PivotOffset = src.PivotOffset
	end)
	pcall(function()
		dst.CanCollide = src.CanCollide
		dst.CanTouch = src.CanTouch
		dst.CanQuery = src.CanQuery
		dst.CastShadow = src.CastShadow
		dst.CollisionGroup = src.CollisionGroup
	end)
	pcall(function()
		dst.Color = src.Color
		dst.Material = src.Material
		dst.Transparency = src.Transparency
		dst.Reflectance = src.Reflectance
	end)
	pcall(function()
		dst.MaterialVariant = src.MaterialVariant
	end)
	pcall(function()
		dst.Locked = src.Locked
		dst.Massless = src.Massless
		dst.RootPriority = src.RootPriority
		dst.CustomPhysicalProperties = src.CustomPhysicalProperties
	end)
	pcall(function()
		dst.AssemblyLinearVelocity = src.AssemblyLinearVelocity
		dst.AssemblyAngularVelocity = src.AssemblyAngularVelocity
	end)
	if dst:IsA("MeshPart") then
		local meshDst = dst :: MeshPart
		pcall(function()
			meshDst.TextureID = overrideTextureId or src.TextureID
		end)
		pcall(function()
			meshDst.CollisionFidelity = src.CollisionFidelity
		end)
		pcall(function()
			meshDst.RenderFidelity = src.RenderFidelity
		end)
		pcall(function()
			(meshDst :: any).DoubleSided = (src :: any).DoubleSided
		end)
	end
	pcall(function()
		for key, value in pairs(src:GetAttributes()) do
			pcall(function()
				dst:SetAttribute(key, value)
			end)
		end
	end)
	pcall(function()
		for _, tag in ipairs(CollectionService:GetTags(src)) do
			pcall(function()
				CollectionService:AddTag(dst, tag)
			end)
		end
	end)
end

--- Re-wires a joint (like a Motor6D or Weld) to point to the new replacement part.
local function rewritePartReference(obj: Instance, src: BasePart, dst: BasePart)
	pcall(function()
		local anyObj = obj :: any
		if anyObj.Part0 == src then
			anyObj.Part0 = dst
		end
	end)
	pcall(function()
		local anyObj = obj :: any
		if anyObj.Part1 == src then
			anyObj.Part1 = dst
		end
	end)
end

--- Moves all children and descendants from the old part to the new part.
---
--- Also scans for any joints that were connected to the old part and re-wires them.
local function moveMeshPartContentsInto(src: BasePart, dst: BasePart)
	pcall(function()
		src.Parent = nil
	end)

	for _, child in ipairs(src:GetChildren()) do
		pcall(function()
			child.Parent = dst
		end)
	end

	local seen: { [Instance]: boolean } = {}
	for _, joint in ipairs(src:GetJoints()) do
		seen[joint] = true
		rewritePartReference(joint, src, dst)
	end
	for _, descendant in ipairs(dst:GetDescendants()) do
		if not seen[descendant] then
			seen[descendant] = true
			rewritePartReference(descendant, src, dst)
		end
	end

	local externalRefsDetected = false
	pcall(function()
		for _, part in ipairs(src:GetConnectedParts()) do
			if
				part ~= src
				and part ~= dst
				and not part:IsDescendantOf(dst)
				and not part:IsDescendantOf(src)
			then
				externalRefsDetected = true
				break
			end
		end
	end)

	if externalRefsDetected then
		logToPlugin(
			"[Warning] [ISpooferMotion] MeshPart replacement detected external constraints pointing to "
				.. src.Name
				.. ". Other external references (e.g. ObjectValues, Scripts) may also be broken."
		)
	end
end

--- Fully replaces a MeshPart's properties and contents into a destination part.
local function copyMeshPartInto(src: MeshPart, dst: BasePart, overrideTextureId: string?)
	copyMeshPartPropertiesInto(src, dst, overrideTextureId)
	moveMeshPartContentsInto(src, dst)
end
