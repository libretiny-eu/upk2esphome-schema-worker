import { DeviceActiveResponse } from "../api/device-types"
import { ObjectType } from "../types"
import { checkAuth, Env } from "./common"

type ProductType = {
	activeResponse: DeviceActiveResponse
	modelResponse: ObjectType
	detailsResponse: ObjectType
}

export async function schemas(
	request: Request,
	env: Env,
	responseContext: any,
): Promise<ObjectType | null | string[] | Response> {
	const url = new URL(request.url)

	if (url.pathname.split("/")[2] === "rebuild") {
		let auth
		if ((auth = checkAuth(request, env, true))) return auth

		const result = []
		const productKeys = (await env.PRODUCTS.list()).keys.map((k) => k.name)
		for (const productKey of productKeys) {
			const product = await env.PRODUCTS.get<ProductType>(
				productKey,
				"json",
			)
			if (!product) continue
			const { activeResponse, modelResponse, detailsResponse } = product
			result.push(activeResponse.schemaId)
			await env.SCHEMAS.put(
				activeResponse.schemaId,
				JSON.stringify(
					{ activeResponse, modelResponse, detailsResponse },
					null,
					"\t",
				),
			)
		}

		return Response.json(result)
	}

	if (request.method == "GET") {
		let schemaKey: string
		if ((schemaKey = url.pathname.split("/")[2])) {
			const schema = await env.SCHEMAS.get<ObjectType>(schemaKey, "json")
			if (!schema) return new Response(null, { status: 404 })
			return schema
		}
		return (await env.SCHEMAS.list()).keys.map((k) => k.name)
	}

	return new Response(null, { status: 405 })
}
