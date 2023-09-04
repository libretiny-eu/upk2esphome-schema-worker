import { TuyaContext } from "@tuya/tuya-connector-nodejs"
import { TuyaAPIConnection } from "../api/device"
import { DeviceActiveResponse } from "../api/device-types"
import { fetchRegionEndpoint } from "../api/iot-dns"
import { patchContext } from "../api/patch"
import { LicenseData, ObjectType, ProjectData } from "../types"
import {
	checkAuth,
	Env,
	getRandomLicense,
	getRandomProject,
	unpack,
} from "./common"

type RequestData = {
	device: {
		firmwareKey: string | null
		productKey: string | null
		factoryPin: string | null
		softwareVer: string
	}
	software?: {
		bv?: string
		pv?: string
		cadv?: string
		cdv?: string
	}
	license?: LicenseData
	project?: ProjectData
	forceUpdate?: boolean
}

type ResponseData = {
	cachedAt: false | number
	cacheKey: string
	tokenResponse: ObjectType
	deviceApi: string
	activeRequest: ObjectType
	activeResponse: DeviceActiveResponse
	checkResponse: ObjectType
	modelResponse: ObjectType
	detailsResponse: ObjectType
	updateResponse: ObjectType
	errors: string[]
}

export async function pullSchema(
	request: Request,
	env: Env,
	responseContext: Partial<ResponseData>,
): Promise<{} | Response> {
	const { method, headers } = request
	if (method != "POST") {
		if (headers.get("Accept")?.includes("text/html"))
			return Response.redirect("https://upk.libretiny.eu")
		return new Response(null, { status: 405 })
	}

	let { device, software, license, project, forceUpdate } =
		await request.json<RequestData>()
	if (!device) throw Error("Needs 'device' object")
	if (!device.softwareVer)
		throw Error("Needs 'softwareVer' string in 'device'")
	if (!device.productKey && !device.factoryPin) {
		if (!device.firmwareKey)
			// no PK, FK, FP
			throw Error(
				"Needs 'firmwareKey', 'productKey' or 'factoryPin' string in 'device'",
			)
		if (!license)
			// only FK
			throw Error("Needs 'license' object when only 'firmwareKey' set")
		// no error: at least one key set + license for FK
	}
	if (license && !(license.uuid && license.authKey))
		throw Error("Needs 'uuid' and 'authKey' string in 'license'")
	if (
		project &&
		!(
			project.baseUrl &&
			project.accessKey &&
			project.secretKey &&
			project.assetId
		)
	)
		throw Error(
			"Needs 'baseUrl', 'accessKey', 'secretKey' and 'assetId' string in 'project'",
		)
	if (device.firmwareKey?.startsWith("key") === false)
		throw Error("'firmwareKey' must start with 'key'")
	if (device.productKey?.startsWith("key") === true)
		throw Error("'productKey' must not start with 'key'")
	if (device.factoryPin?.startsWith("key") === true)
		throw Error("'factoryPin' must not start with 'key'")

	// check available keys
	const productKey =
		device.factoryPin ?? device.productKey ?? device.firmwareKey
	if (!productKey) throw Error("Missing 'productKey'")

	// try cached results
	const cached = await env.PRODUCTS.get<ResponseData>(productKey, "json")
	if (cached) {
		if (!forceUpdate) return cached
		// make sure we're admin
		let auth
		if ((auth = checkAuth(request, env, true))) return auth
	}

	// use provided credentials if not specified
	project = project ?? (await getRandomProject(env))
	license = license ?? (await getRandomLicense(env))

	// build cloud API
	const tuya = new TuyaContext(project)
	patchContext(tuya)

	// generate registration token
	const tokenResponse = await unpack(
		tuya.deviceRegistration.createToken({
			asset_id: project.assetId,
			uid: null as any as string,
			pairing_type: project.pairingType ?? "ap",
			time_zone_id:
				project.timeZoneId ??
				(request.cf?.timezone as string) ??
				"Etc/Greenwich",
		}),
	)
	const { token, region } = (responseContext.tokenResponse = tokenResponse)

	// build device API base URL
	let deviceApi: string
	try {
		deviceApi = await fetchRegionEndpoint(region)
	} catch {
		const url = new URL(project.baseUrl)
		deviceApi = `http://${url.hostname.replace("openapi.", "a.")}/d.json`
	}
	responseContext.deviceApi = deviceApi

	// build device API
	const conn = new TuyaAPIConnection(
		deviceApi,
		license?.uuid,
		license?.authKey,
	)
	// build activation payload
	const activeRequest = {
		token: token,
		productKey: productKey,
		softVer: device.softwareVer,
		protocolVer: software?.pv ?? "2.2",
		baselineVer: software?.bv ?? "40.00",
		cadVer: software?.cadv ?? "1.0.3",
		cdVer: software?.cdv ?? "1.0.0",
		options: JSON.stringify({ isFK: productKey.startsWith("key") }),
	}
	responseContext.activeRequest = activeRequest

	// activate the device
	const activeResponse = await conn.request<DeviceActiveResponse>(
		"tuya.device.active",
		"4.4",
		activeRequest,
		true,
	)
	const { schema: schemaText, devId } = activeResponse
	activeResponse.schema = JSON.parse(schemaText)
	responseContext.activeResponse = activeResponse

	// check if the device was activated
	const checkResponse = await unpack<any>(
		tuya.request({
			path: `/v1.1/iot-03/device-registration/tokens/${token}`,
			method: "GET",
		}),
	)
	const { success_devices: successDevices } = (responseContext.checkResponse =
		checkResponse)
	let activatedDevice: ObjectType | null = null
	for (const device of successDevices) {
		if (device.id == devId) activatedDevice = device
	}

	// raise error if not activated
	if (activatedDevice === null) throw Error("Device not activated")

	// proceed to read device schema model
	const modelResponse = await unpack<{ model: string }>(
		tuya.request({
			path: `/v2.0/cloud/thing/${devId}/model`,
			method: "GET",
		}),
	)
	const { model: modelText } = modelResponse
	modelResponse.model = JSON.parse(modelText)
	responseContext.modelResponse = modelResponse

	// read additional info, but don't fail on errors
	const errors: string[] = (responseContext.errors = [])
	try {
		responseContext.detailsResponse = await unpack(
			tuya.device.detail({ device_id: devId }),
		)
	} catch (e) {
		errors.push(`${e}`)
	}
	try {
		responseContext.updateResponse = await unpack(
			tuya.request({
				path: `/v2.0/cloud/thing/${devId}/firmware`,
				method: "GET",
			}),
		)
	} catch (e) {
		errors.push(`${e}`)
	}

	responseContext.cachedAt = Date.now()
	responseContext.cacheKey = productKey

	await env.PRODUCTS.put(
		productKey,
		JSON.stringify(responseContext, null, "\t"),
	)
	if (activeResponse.schemaId) {
		await env.SCHEMAS.put(
			activeResponse.schemaId,
			JSON.stringify({ activeResponse, modelResponse }, null, "\t"),
		)
	} else {
		errors.push("Schema ID not found in activeResponse")
	}

	responseContext.cachedAt = false
	return {}
}
