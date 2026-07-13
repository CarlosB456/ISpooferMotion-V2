--!nolint UnknownGlobal
--!nocheck
--!nolint

-- luacheck: ignore
---@diagnostic disable: undefined-global, unused-local, unused-function, lowercase-global
--- Handles the in-Studio graphical interface for the plugin.
---
--- Since Roblox plugins cannot easily use HTML or standard desktop UIs, we
--- build a custom ScreenGui that renders inside the Studio viewport. This shows
--- connection status and live logs so the user knows what the daemon is doing.
local CoreGui = game:GetService("CoreGui")
local gui = nil
local statusText = nil
local logsScrollingFrame = nil

--- Bootstraps the ScreenGui and injects it into CoreGui.
---
--- We prefer CoreGui so our panel renders above the game viewport and does
--- not get accidentally deleted by the user, but we fall back to StarterGui
--- if we do not have permission.
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
	container.Name = "MainPanel"
	container.Size = UDim2.fromOffset(680, 420)
	container.Position = UDim2.fromScale(0.5, 0.5)
	container.AnchorPoint = Vector2.new(0.5, 0.5)
	container.BackgroundColor3 = Color3.fromHex("#09090b")
	container.BorderSizePixel = 0
	container.Parent = gui

	local panelCorner = Instance.new("UICorner")
	panelCorner.CornerRadius = UDim.new(0, 8)
	panelCorner.Parent = container

	local panelStroke = Instance.new("UIStroke")
	panelStroke.Color = Color3.fromHex("#27272a")
	panelStroke.Thickness = 1
	panelStroke.Parent = container

	local header = Instance.new("Frame")
	header.Name = "Header"
	header.Size = UDim2.new(1, 0, 0, 56)
	header.BackgroundTransparency = 1
	header.Parent = container

	local icon = Instance.new("ImageLabel")
	icon.Name = "Icon"
	icon.Size = UDim2.fromOffset(36, 36)
	icon.Position = UDim2.new(0, 16, 0.5, 0)
	icon.AnchorPoint = Vector2.new(0, 0.5)
	icon.BackgroundTransparency = 1
	icon.Image = "rbxassetid://137844667859456"
	icon.Parent = header

	local title = Instance.new("TextLabel")
	title.Name = "Title"
	title.Size = UDim2.fromOffset(200, 20)
	title.Position = UDim2.new(0, 64, 0.5, -8)
	title.AnchorPoint = Vector2.new(0, 0.5)
	title.BackgroundTransparency = 1
	title.Font = Enum.Font.BuilderSansExtraBold
	title.TextSize = 14
	title.TextColor3 = Color3.fromHex("#fafafa")
	title.TextXAlignment = Enum.TextXAlignment.Left
	title.Text = "ISpooferMotion"
	title.Parent = header

	local versionLabel = Instance.new("TextLabel")
	versionLabel.Name = "VersionWatermark"
	versionLabel.Size = UDim2.fromOffset(100, 14)
	versionLabel.Position = UDim2.new(0, 64, 0.5, 10)
	versionLabel.AnchorPoint = Vector2.new(0, 0.5)
	versionLabel.BackgroundTransparency = 1
	versionLabel.Font = Enum.Font.BuilderSansMedium
	versionLabel.TextSize = 12
	versionLabel.TextColor3 = Color3.fromHex("#a1a1aa")
	versionLabel.TextXAlignment = Enum.TextXAlignment.Left
	versionLabel.Text = "v" .. (PLUGIN_VERSION or "Unknown")
	versionLabel.Parent = header

	statusText = Instance.new("TextLabel")
	statusText.Name = "StatusText"
	statusText.Size = UDim2.new(0, 250, 1, 0)
	statusText.Position = UDim2.fromScale(0.5, 0.5)
	statusText.AnchorPoint = Vector2.new(0.5, 0.5)
	statusText.BackgroundTransparency = 1
	statusText.Font = Enum.Font.BuilderSansMedium
	statusText.TextSize = 13
	statusText.TextColor3 = Color3.fromHex("#fafafa")
	statusText.TextXAlignment = Enum.TextXAlignment.Center
	statusText.Text = "Waiting for Desktop App..."
	statusText.Parent = header

	local copyLogsButton = Instance.new("TextButton")
	copyLogsButton.Name = "CopyLogsButton"
	copyLogsButton.Size = UDim2.fromOffset(100, 32)
	copyLogsButton.Position = UDim2.new(1, -16, 0.5, 0)
	copyLogsButton.AnchorPoint = Vector2.new(1, 0.5)
	copyLogsButton.BackgroundColor3 = Color3.fromHex("#09090b")
	copyLogsButton.BorderSizePixel = 0
	copyLogsButton.Font = Enum.Font.BuilderSansMedium
	copyLogsButton.TextSize = 13
	copyLogsButton.TextColor3 = Color3.fromHex("#fafafa")
	copyLogsButton.Text = "Export Logs"
	copyLogsButton.AutoButtonColor = false
	copyLogsButton.Parent = header

	local btnCorner = Instance.new("UICorner")
	btnCorner.CornerRadius = UDim.new(0, 6)
	btnCorner.Parent = copyLogsButton

	local btnStroke = Instance.new("UIStroke")
	btnStroke.Color = Color3.fromHex("#27272a")
	btnStroke.Thickness = 1
	btnStroke.Parent = copyLogsButton

	copyLogsButton.MouseEnter:Connect(function()
		copyLogsButton.BackgroundColor3 = Color3.fromHex("#27272a")
	end)
	copyLogsButton.MouseLeave:Connect(function()
		copyLogsButton.BackgroundColor3 = Color3.fromHex("#09090b")
	end)
	copyLogsButton.MouseButton1Down:Connect(function()
		copyLogsButton.BackgroundColor3 = Color3.fromHex("#18181b")
	end)
	copyLogsButton.MouseButton1Up:Connect(function()
		copyLogsButton.BackgroundColor3 = Color3.fromHex("#27272a")
	end)

	copyLogsButton.MouseButton1Click:Connect(function()
		local logs = {}
		if logsScrollingFrame then
			for _, child in ipairs(logsScrollingFrame:GetChildren()) do
				if child:IsA("TextLabel") then
					table.insert(logs, { order = child.LayoutOrder, text = child.Text })
				end
			end
			table.sort(logs, function(a, b)
				return a.order < b.order
			end)
			local logStrings = {}
			for _, logItem in ipairs(logs) do
				table.insert(logStrings, logItem.text)
			end
			local finalString = table.concat(logStrings, "\n")
			if finalString == "" then
				finalString = "(No logs generated yet)"
			end

			local logScript = Instance.new("Script")
			logScript.Name = "ISpooferMotion_Logs"
			logScript.Source = "-- ISpooferMotion Logs\n-- Copy the contents below:\n\n--[[\n"
				.. finalString
				.. "\n]]"
			logScript.Parent = game:GetService("ServerStorage")

			local exportSuccess, err = pcall(function()
				-- selene: allow(deprecated)
				plugin:OpenScript(logScript)
			end)

			if exportSuccess then
				copyLogsButton.Text = "Exported!"
			else
				warn("ISpooferMotion Export Logs Failed: " .. tostring(err))
				copyLogsButton.Text = "Error"
			end

			task.delay(1.5, function()
				if copyLogsButton then
					copyLogsButton.Text = "Export Logs"
				end
			end)
		end
	end)

	-- Tab Bar
	local tabBar = Instance.new("Frame")
	tabBar.Name = "TabBar"
	tabBar.Size = UDim2.new(1, -32, 0, 32)
	tabBar.Position = UDim2.fromOffset(16, 56)
	tabBar.BackgroundTransparency = 1
	tabBar.Parent = container

	local tabListLayout = Instance.new("UIListLayout")
	tabListLayout.FillDirection = Enum.FillDirection.Horizontal
	tabListLayout.SortOrder = Enum.SortOrder.LayoutOrder
	tabListLayout.Padding = UDim.new(0, 8)
	tabListLayout.Parent = tabBar

	local function createTabButton(name, text, order, isActive)
		local btn = Instance.new("TextButton")
		btn.Name = name
		btn.Size = UDim2.fromOffset(120, 32)
		btn.BackgroundColor3 = isActive and Color3.fromHex("#18181b") or Color3.fromHex("#09090b")
		btn.BorderSizePixel = 0
		btn.Font = Enum.Font.BuilderSansMedium
		btn.TextSize = 13
		btn.TextColor3 = isActive and Color3.fromHex("#ffffff") or Color3.fromHex("#a1a1aa")
		btn.Text = text
		btn.AutoButtonColor = false
		btn.LayoutOrder = order

		local corner = Instance.new("UICorner")
		corner.CornerRadius = UDim.new(0, 6)
		corner.Parent = btn

		local stroke = Instance.new("UIStroke")
		stroke.Color = Color3.fromHex("#27272a")
		stroke.Thickness = 1
		stroke.Parent = btn

		return btn
	end

	local consoleTabBtn = createTabButton("ConsoleTab", "Console Logs", 1, true)
	consoleTabBtn.Parent = tabBar

	local manualTabBtn = createTabButton("ManualTab", "Manual Swap", 2, false)
	manualTabBtn.Parent = tabBar

	-- Containers
	local contentArea = Instance.new("Frame")
	contentArea.Name = "ContentArea"
	contentArea.Size = UDim2.new(1, -32, 1, -104)
	contentArea.Position = UDim2.fromOffset(16, 96)
	contentArea.BackgroundTransparency = 1
	contentArea.Parent = container

	-- CONSOLE CONTAINER
	local logsContainer = Instance.new("Frame")
	logsContainer.Name = "LogsContainer"
	logsContainer.Size = UDim2.fromScale(1, 1)
	logsContainer.BackgroundColor3 = Color3.fromHex("#09090b")
	logsContainer.BorderSizePixel = 0
	logsContainer.Parent = contentArea

	local logsCorner = Instance.new("UICorner")
	logsCorner.CornerRadius = UDim.new(0, 6)
	logsCorner.Parent = logsContainer

	local logsStroke = Instance.new("UIStroke")
	logsStroke.Color = Color3.fromHex("#27272a")
	logsStroke.Thickness = 1
	logsStroke.Parent = logsContainer

	logsScrollingFrame = Instance.new("ScrollingFrame")
	logsScrollingFrame.Name = "Logs"
	logsScrollingFrame.Size = UDim2.fromScale(1, 1)
	logsScrollingFrame.BackgroundTransparency = 1
	logsScrollingFrame.BorderSizePixel = 0
	logsScrollingFrame.ScrollBarThickness = 6
	logsScrollingFrame.ScrollBarImageColor3 = Color3.fromHex("#27272a")
	logsScrollingFrame.CanvasSize = UDim2.new(0, 0, 0, 0)
	logsScrollingFrame.AutomaticCanvasSize = Enum.AutomaticSize.Y
	logsScrollingFrame.ScrollingEnabled = true
	logsScrollingFrame.Active = true
	logsScrollingFrame.Parent = logsContainer

	local logsPadding = Instance.new("UIPadding")
	logsPadding.PaddingLeft = UDim.new(0, 12)
	logsPadding.PaddingRight = UDim.new(0, 4)
	logsPadding.PaddingTop = UDim.new(0, 8)
	logsPadding.PaddingBottom = UDim.new(0, 8)
	logsPadding.Parent = logsScrollingFrame

	local listLayout = Instance.new("UIListLayout")
	listLayout.Parent = logsScrollingFrame
	listLayout.SortOrder = Enum.SortOrder.LayoutOrder
	listLayout.Padding = UDim.new(0, 4)

	listLayout:GetPropertyChangedSignal("AbsoluteContentSize"):Connect(function()
		local maxScroll = logsScrollingFrame.AbsoluteCanvasSize.Y
			- logsScrollingFrame.AbsoluteWindowSize.Y
		local isAtBottom = logsScrollingFrame.CanvasPosition.Y >= (maxScroll - 50)
		task.defer(function()
			if isAtBottom or maxScroll <= 0 then
				logsScrollingFrame.CanvasPosition =
					Vector2.new(0, logsScrollingFrame.AbsoluteCanvasSize.Y)
			end
		end)
	end)

	-- MANUAL REPLACEMENTS CONTAINER
	local manualContainer = Instance.new("Frame")
	manualContainer.Name = "ManualContainer"
	manualContainer.Size = UDim2.fromScale(1, 1)
	manualContainer.BackgroundTransparency = 1
	manualContainer.Visible = false
	manualContainer.Parent = contentArea

	local manualBox = Instance.new("TextBox")
	manualBox.Name = "InputBox"
	manualBox.Size = UDim2.new(1, 0, 1, -44)
	manualBox.BackgroundColor3 = Color3.fromHex("#09090b")
	manualBox.BorderSizePixel = 0
	manualBox.Font = Enum.Font.RobotoMono
	manualBox.TextSize = 13
	manualBox.TextColor3 = Color3.fromHex("#fafafa")
	manualBox.PlaceholderText = "Paste 'oldId -> newId' pairs here..."
	manualBox.TextXAlignment = Enum.TextXAlignment.Left
	manualBox.TextYAlignment = Enum.TextYAlignment.Top
	manualBox.TextWrapped = true
	manualBox.ClearTextOnFocus = false
	manualBox.MultiLine = true
	manualBox.Text = ""
	manualBox.Parent = manualContainer

	local manualBoxCorner = Instance.new("UICorner")
	manualBoxCorner.CornerRadius = UDim.new(0, 6)
	manualBoxCorner.Parent = manualBox

	local manualBoxStroke = Instance.new("UIStroke")
	manualBoxStroke.Color = Color3.fromHex("#27272a")
	manualBoxStroke.Thickness = 1
	manualBoxStroke.Parent = manualBox

	local manualBoxPadding = Instance.new("UIPadding")
	manualBoxPadding.PaddingLeft = UDim.new(0, 8)
	manualBoxPadding.PaddingRight = UDim.new(0, 8)
	manualBoxPadding.PaddingTop = UDim.new(0, 8)
	manualBoxPadding.PaddingBottom = UDim.new(0, 8)
	manualBoxPadding.Parent = manualBox

	local runManualBtn = Instance.new("TextButton")
	runManualBtn.Name = "RunButton"
	runManualBtn.Size = UDim2.new(1, 0, 0, 36)
	runManualBtn.Position = UDim2.new(0, 0, 1, -36)
	runManualBtn.BackgroundColor3 = Color3.fromHex("#27272a")
	runManualBtn.BorderSizePixel = 0
	runManualBtn.Font = Enum.Font.BuilderSansMedium
	runManualBtn.TextSize = 14
	runManualBtn.TextColor3 = Color3.fromHex("#ffffff")
	runManualBtn.Text = "Run Replacements"
	runManualBtn.AutoButtonColor = false
	runManualBtn.Parent = manualContainer

	local runBtnCorner = Instance.new("UICorner")
	runBtnCorner.CornerRadius = UDim.new(0, 6)
	runBtnCorner.Parent = runManualBtn

	runManualBtn.MouseEnter:Connect(function()
		runManualBtn.BackgroundColor3 = Color3.fromHex("#3f3f46")
	end)
	runManualBtn.MouseLeave:Connect(function()
		runManualBtn.BackgroundColor3 = Color3.fromHex("#27272a")
	end)
	runManualBtn.MouseButton1Down:Connect(function()
		runManualBtn.BackgroundColor3 = Color3.fromHex("#18181b")
	end)
	runManualBtn.MouseButton1Up:Connect(function()
		runManualBtn.BackgroundColor3 = Color3.fromHex("#3f3f46")
	end)

	runManualBtn.MouseButton1Click:Connect(function()
		local txt = manualBox.Text
		local _G_plugin = _G.ISpooferMotionPlugin
		if _G_plugin and _G_plugin.runManualReplacements then
			_G_plugin.runManualReplacements(txt)
		else
			warn("[ISpooferMotion] Manual replacement handler not linked.")
		end
	end)

	-- Tab Switching Logic
	local function switchTab(tab)
		if tab == "console" then
			consoleTabBtn.BackgroundColor3 = Color3.fromHex("#18181b")
			consoleTabBtn.TextColor3 = Color3.fromHex("#ffffff")
			manualTabBtn.BackgroundColor3 = Color3.fromHex("#09090b")
			manualTabBtn.TextColor3 = Color3.fromHex("#a1a1aa")

			logsContainer.Visible = true
			manualContainer.Visible = false
			copyLogsButton.Visible = true
		else
			manualTabBtn.BackgroundColor3 = Color3.fromHex("#18181b")
			manualTabBtn.TextColor3 = Color3.fromHex("#ffffff")
			consoleTabBtn.BackgroundColor3 = Color3.fromHex("#09090b")
			consoleTabBtn.TextColor3 = Color3.fromHex("#a1a1aa")

			logsContainer.Visible = false
			manualContainer.Visible = true
			copyLogsButton.Visible = false
		end
	end

	consoleTabBtn.MouseButton1Click:Connect(function()
		switchTab("console")
	end)
	manualTabBtn.MouseButton1Click:Connect(function()
		switchTab("manual")
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
		logLabel.Size = UDim2.new(1, -8, 0, 0)
		logLabel.BackgroundTransparency = 1
		logLabel.Font = Enum.Font.RobotoMono
		logLabel.TextSize = 13

		-- Color based on message type
		if messageType == Enum.MessageType.MessageError then
			logLabel.TextColor3 = Color3.fromRGB(248, 113, 113) -- Red 400
		elseif messageType == Enum.MessageType.MessageWarning then
			logLabel.TextColor3 = Color3.fromRGB(250, 204, 21) -- Yellow 400
		else
			logLabel.TextColor3 = Color3.fromRGB(212, 212, 216) -- Zinc 300
		end

		logLabel.TextXAlignment = Enum.TextXAlignment.Left
		logLabel.TextWrapped = true

		-- Strip the prefix for cleaner UI
		local cleanMsg = string.gsub(message, "%[ISpooferMotion%] ", "")
		cleanMsg = string.gsub(cleanMsg, "%[Warning%] ", "")

		logLabel.Text = cleanMsg
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

--- Unified logging function that prints to both the Studio output and our UI.
function logToPlugin(text)
	local msg = tostring(text)
	-- Use plain=true so "[Warning]" is matched as a literal string, not a Lua character class.
	if string.find(msg, "[Warning]", 1, true) then
		warn(msg)
	else
		print("[ISpooferMotion] " .. msg)
	end
end

-- Pass silent=true for transient progress updates that should not produce log output.
--- Updates the main status text on the UI.
---
--- Pass `silent=true` for rapid progress updates (like scan chunks) that
--- we want to show visually without spamming the output console.
local function setPluginGuiStatus(text: string, silent: boolean?)
	if not gui then
		createPluginGui()
	end
	if statusText then
		statusText.Text = text
	end
	if not silent then
		logToPlugin(text)
	end
end

--- Completely destroys the UI and resets the log state.
function hidePluginGui()
	if gui then
		gui:Destroy()
		gui = nil
		statusText = nil
		logsScrollingFrame = nil
		-- Reset counter so eviction logic works correctly when the GUI is recreated.
		logCounter = 0
	end
end

--- Toggles visibility of the UI, creating it if it does not exist yet.
function togglePluginGui()
	if not gui then
		createPluginGui()
	end
	if gui then
		gui.Enabled = not gui.Enabled
	end
end
