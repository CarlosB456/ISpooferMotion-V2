--!nocheck
--!nolint
-- luacheck: ignore
---@diagnostic disable: undefined-global, unused-local, unused-function, lowercase-global
--- Handles finding the active desktop daemon instance.
---
--- The desktop app binds to an ephemeral port to avoid collisions. We scan
--- the localhost port range (`PORT_START` to `PORT_END`) and pick the daemon
--- that was started most recently.
local function responseLooksLikeAppHealth(decoded: any): boolean
	return type(decoded) == "table" and decoded.app == "ISpooferMotion"
end

--- Sweeps the known port range looking for the desktop daemon.
---
--- If we already have a `BASE_URL`, we probe it first to save time on
--- reconnects before falling back to a full port scan.
local function discoverServer(): (boolean, boolean)
	local newestUrl = nil
	local newestStartedAt = -1
	local pending = 0
	local results: { { url: string, startedAt: number, health: any } } = {}

	-- Only probe loopback addresses - nip.io is an external DNS dependency and adds
	-- unnecessary latency and a hard failure point for users without internet.
	local hosts = { "127.0.0.1", "localhost" }
	local cancelled = false

	-- IMP-8: If we already have a known BASE_URL, probe it first with a short timeout
	-- before falling back to the full port scan. This avoids 14 wasted requests on reconnect.
	if BASE_URL then
		pending += 1
		local knownUrl = BASE_URL
		task.spawn(function()
			if not cancelled then
				local ok, response = pcall(function()
					return HttpService:RequestAsync({
						Url = knownUrl .. "/health",
						Method = "GET",
					})
				end)
				if ok and response and response.Success and not cancelled then
					local decodedOk, decoded = decodeJsonResponseBody(response)
					if decodedOk and responseLooksLikeAppHealth(decoded) then
						local startedAt = tonumber(decoded.startedAt) or 0
						table.insert(results, {
							url = knownUrl,
							startedAt = startedAt,
							health = decoded,
						})
					end
				end
			end
			pending -= 1
		end)
	end

	for port = PORT_START, PORT_END do
		for _, host in ipairs(hosts) do
			pending += 1
			local url = "http://" .. host .. ":" .. port

			task.spawn(function()
				-- Exit early if discovery was already cancelled.
				if cancelled then
					pending -= 1
					return
				end
				pcall(function()
					local ok, response = pcall(function()
						return HttpService:RequestAsync({
							Url = url .. "/health",
							Method = "GET",
						})
					end)

					if ok and response and response.Success and not cancelled then
						local decodedOk, decoded = decodeJsonResponseBody(response)
						if decodedOk and responseLooksLikeAppHealth(decoded) then
							local startedAt = tonumber(decoded.startedAt) or 0
							table.insert(results, {
								url = url,
								startedAt = startedAt,
								health = decoded,
							})
						end
					end
				end)
				-- Always decrement pending, even if pcall above threw.
				pending -= 1
			end)
		end
	end

	local timeout = os.clock() + 5
	while pending > 0 and os.clock() < timeout do
		task.wait(0.05)
	end
	cancelled = true

	table.sort(results, function(a, b)
		return a.startedAt > b.startedAt
	end)

	if #results > 0 then
		local best = results[1]
		local changed = BASE_URL ~= best.url
		BASE_URL = best.url

		-- Update accent color if provided
		if best.health and best.health.themeAccent then
			if type(setThemeAccent) == "function" then
				setThemeAccent(best.health.themeAccent)
			end
		end

		return true, changed
	end

	return false, false
end
