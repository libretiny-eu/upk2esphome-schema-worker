import { ObjectType } from "../types"
import { Env } from "./common"

export async function products(
	request: Request,
	env: Env,
	responseContext: any,
): Promise<ObjectType | null | string[] | Response> {
	const url = new URL(request.url)

	if (request.method == "GET" || request.method == "DELETE") {
		let productKey: string
		if ((productKey = url.pathname.split("/")[2])) {
			const product = await env.PRODUCTS.get<ObjectType>(
				productKey,
				"json",
			)
			if (!product) return new Response(null, { status: 404 })
			if (request.method == "DELETE") {
				await env.PRODUCTS.delete(productKey)
				return new Response(null, { status: 204 })
			}
			return product
		}
		return (await env.PRODUCTS.list()).keys.map((k) => k.name)
	}

	return new Response(null, { status: 405 })
}
