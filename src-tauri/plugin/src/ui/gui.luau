--!nocheck
--!nolint
-- luacheck: ignore
---@diagnostic disable: undefined-global, unused-local, unused-function, lowercase-global
local CoreGui = game:GetService("CoreGui")
local gui = nil
local statusText = nil
local logsScrollingFrame = nil

local function createPluginGui()
	if gui then
		return
	end

	gui = Instance.new("ScreenGui")
	gui.Name = "ISpooferMotionPluginGui"
	gui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling

	local success = pcall(function()
		gui.Parent = CoreGui
	end)
	if not success then
		gui.Parent = game:GetService("StarterGui")
	end

	local container = Instance.new("Frame")
	container.Name = "Container"
	container.Size = UDim2.fromScale(1, 1)
	container.BackgroundTransparency = 1
	container.Parent = gui

	local icon = Instance.new("ImageLabel")
	icon.Name = "Icon"
	icon.Size = UDim2.fromOffset(80, 80)
	icon.Position = UDim2.new(0.5, 0, 0, 30)
	icon.AnchorPoint = Vector2.new(0.5, 0)
	icon.BackgroundTransparency = 1
	icon.Image = "rbxassetid://137844667859456"
	icon.Parent = container

	statusText = Instance.new("TextLabel")
	statusText.Name = "StatusText"
	statusText.Size = UDim2.new(1, -40, 0, 40)
	statusText.Position = UDim2.new(0.5, 0, 0, 120)
	statusText.AnchorPoint = Vector2.new(0.5, 0)
	statusText.BackgroundTransparency = 1
	statusText.Font = Enum.Font.GothamMedium
	statusText.TextSize = 24
	statusText.TextColor3 = Color3.new(1, 1, 1)
	statusText.TextStrokeColor3 = Color3.new(0, 0, 0)
	statusText.TextStrokeTransparency = 0
	statusText.TextWrapped = true
	statusText.Text = "Connected to ISpooferMotion Desktop App."
	statusText.Parent = container

	logsScrollingFrame = Instance.new("ScrollingFrame")
	logsScrollingFrame.Name = "Logs"
	logsScrollingFrame.Size = UDim2.fromOffset(600, 300)
	logsScrollingFrame.Position = UDim2.new(0.5, 0, 0, 180)
	logsScrollingFrame.AnchorPoint = Vector2.new(0.5, 0)
	logsScrollingFrame.BackgroundTransparency = 0.1
	logsScrollingFrame.BackgroundColor3 = Color3.fromRGB(30, 30, 34)
	logsScrollingFrame.BorderSizePixel = 0
	logsScrollingFrame.ScrollBarThickness = 6
	logsScrollingFrame.CanvasSize = UDim2.new(0, 0, 0, 0)
	logsScrollingFrame.Parent = container

	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, 8)
	corner.Parent = logsScrollingFrame

	local padding = Instance.new("UIPadding")
	padding.PaddingTop = UDim.new(0, 10)
	padding.PaddingBottom = UDim.new(0, 10)
	padding.PaddingLeft = UDim.new(0, 10)
	padding.PaddingRight = UDim.new(0, 10)
	padding.Parent = logsScrollingFrame

	local listLayout = Instance.new("UIListLayout")
	listLayout.Parent = logsScrollingFrame
	listLayout.SortOrder = Enum.SortOrder.LayoutOrder
	listLayout.Padding = UDim.new(0, 4)

	listLayout:GetPropertyChangedSignal("AbsoluteContentSize"):Connect(function()
		logsScrollingFrame.CanvasSize = UDim2.fromOffset(0, listLayout.AbsoluteContentSize.Y)
		logsScrollingFrame.CanvasPosition = Vector2.new(0, listLayout.AbsoluteContentSize.Y)
	end)

	return gui
end

local logCounter = 0
local LogService = game:GetService("LogService")

LogService.MessageOut:Connect(function(message, messageType)
	if not logsScrollingFrame then
		return
	end

	-- We want to show everything from ISpooferMotion
	if string.find(message, "[ISpooferMotion]", 1, true) then
		logCounter += 1
		local logLabel = Instance.new("TextLabel")
		logLabel.Name = "Log_" .. logCounter
		logLabel.Size = UDim2.fromScale(1, 0)
		logLabel.BackgroundTransparency = 1
		logLabel.Font = Enum.Font.RobotoMono
		logLabel.TextSize = 13

		-- Color based on message type
		if messageType == Enum.MessageType.MessageError then
			logLabel.TextColor3 = Color3.fromRGB(255, 100, 100)
		elseif messageType == Enum.MessageType.MessageWarning then
			logLabel.TextColor3 = Color3.fromRGB(255, 190, 80)
		else
			logLabel.TextColor3 = Color3.fromRGB(200, 200, 200)
		end

		logLabel.TextStrokeColor3 = Color3.new(0, 0, 0)
		logLabel.TextStrokeTransparency = 0.5
		logLabel.TextXAlignment = Enum.TextXAlignment.Left
		logLabel.TextWrapped = true

		-- Strip the prefix for cleaner UI
		local cleanMsg = string.gsub(message, "%[ISpooferMotion%] ", "")
		cleanMsg = string.gsub(cleanMsg, "%[Warning%] ", "")

		logLabel.Text = "> " .. cleanMsg
		logLabel.AutomaticSize = Enum.AutomaticSize.Y
		logLabel.LayoutOrder = logCounter
		logLabel.Parent = logsScrollingFrame

		if logCounter > 200 then
			local oldest = logsScrollingFrame:FindFirstChild("Log_" .. (logCounter - 200))
			if oldest then
				oldest:Destroy()
			end
		end
	end
end)

function logToPlugin(text)
	local msg = tostring(text)
	if string.find(msg, "[Warning]") then
		warn(msg)
	else
		print("[ISpooferMotion] " .. msg)
	end
end

local function setPluginGuiStatus(text)
	if not gui then
		createPluginGui()
	end
	if statusText then
		statusText.Text = text
	end
	logToPlugin(text)
end

function hidePluginGui()
	if gui then
		gui:Destroy()
		gui = nil
		statusText = nil
		logsScrollingFrame = nil
	end
end

function togglePluginGui()
	if not gui then
		createPluginGui()
	end
	if gui then
		gui.Enabled = not gui.Enabled
	end
end
