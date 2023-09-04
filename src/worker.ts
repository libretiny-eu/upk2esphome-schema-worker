import { checkAuth, Env } from "./routes/common"
import { licenses } from "./routes/licenses"
import { products } from "./routes/products"
import { projects } from "./routes/projects"
import { pullSchema } from "./routes/pull-schema"
import { schemas } from "./routes/schemas"
import { ObjectType } from "./types"

export default {
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext,
	): Promise<Response> {
		const url = new URL(request.url)

		let response: ObjectType | null
		let auth: Response | null
		const responseContext = {}

		try {
			switch ("/" + url.pathname.split("/")[1]) {
				case "/":
					if (request.headers.get("Accept")?.includes("text/html"))
						return Response.redirect("https://upk.libretiny.eu")
					return new Response(null, { status: 404 })

				case "/pullSchema":
					if ((auth = checkAuth(request, env))) return auth
					response = await pullSchema(request, env, responseContext)
					break

				case "/projects":
					if ((auth = checkAuth(request, env, true))) return auth
					response = await projects(request, env, responseContext)
					break

				case "/licenses":
					if ((auth = checkAuth(request, env, true))) return auth
					response = await licenses(request, env, responseContext)
					break

				case "/products":
					if ((auth = checkAuth(request, env))) return auth
					response = await products(request, env, responseContext)
					break

				case "/schemas":
					if ((auth = checkAuth(request, env))) return auth
					response = await schemas(request, env, responseContext)
					break

				default:
					return new Response(null, { status: 404 })
			}
		} catch (e) {
			return new Response(JSON.stringify({ message: `${e}` }), {
				status: 400,
			})
		}

		if (response instanceof Response) return response
		if (Object.keys(responseContext).length)
			return Response.json({ ...responseContext, ...response })
		return Response.json(response)
	},
}
