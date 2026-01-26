// kilocode_change - Kilo Gateway server routes
/**
 * Kilo Gateway specific routes
 * Handles profile fetching and organization management for Kilo Gateway provider
 *
 * This factory function accepts OpenCode dependencies to create Kilo-specific routes
 */

import { fetchProfile, fetchBalance } from "../api/profile.js"

// Type definitions for OpenCode dependencies (injected at runtime)
type Hono = any
type DescribeRoute = any
type Validator = any
type Resolver = any
type Errors = any
type Auth = any
type Lazy = any
type Z = any

interface KiloRoutesDeps {
  Hono: new () => Hono
  describeRoute: DescribeRoute
  validator: Validator
  resolver: Resolver
  errors: Errors
  Auth: Auth
  lazy: Lazy
  z: Z
}

/**
 * Create Kilo Gateway routes with OpenCode dependencies injected
 *
 * @example
 * ```typescript
 * import { createKiloRoutes } from "@kilocode/kilo-gateway"
 * import { Hono } from "hono"
 * import { describeRoute, validator, resolver } from "hono-openapi"
 * import z from "zod"
 * import { errors } from "../error"
 * import { Auth } from "../../auth"
 * import { lazy } from "../../util/lazy"
 *
 * export const KiloRoutes = createKiloRoutes({
 *   Hono,
 *   describeRoute,
 *   validator,
 *   resolver,
 *   errors,
 *   Auth,
 *   lazy,
 *   z,
 * })
 * ```
 */
export function createKiloRoutes(deps: KiloRoutesDeps) {
  const { Hono, describeRoute, validator, resolver, errors, Auth, lazy, z } = deps

  const Organization = z.object({
    id: z.string(),
    name: z.string(),
    role: z.string(),
  })

  const Profile = z.object({
    email: z.string(),
    name: z.string().optional(),
    organizations: z.array(Organization).optional(),
  })

  const Balance = z.object({
    balance: z.number(),
  })

  const ProfileWithBalance = z.object({
    profile: Profile,
    balance: Balance.nullable(),
  })

  return lazy(() =>
    new Hono()
      .get(
        "/profile",
        describeRoute({
          summary: "Get Kilo Gateway profile",
          description: "Fetch user profile and organizations from Kilo Gateway",
          operationId: "kilo.profile",
          responses: {
            200: {
              description: "Profile data",
              content: {
                "application/json": {
                  schema: resolver(ProfileWithBalance),
                },
              },
            },
            ...errors(400, 401),
          },
        }),
        async (c: any) => {
          // Get Kilo auth
          const auth = await Auth.get("kilo")

          if (!auth || auth.type !== "oauth") {
            return c.json({ error: "Not authenticated with Kilo Gateway" }, 401)
          }

          const token = auth.access

          // Fetch profile and balance in parallel
          const [profile, balance] = await Promise.all([fetchProfile(token), fetchBalance(token)])

          return c.json({ profile, balance })
        },
      )
      .post(
        "/organization",
        describeRoute({
          summary: "Update Kilo Gateway organization",
          description: "Switch to a different Kilo Gateway organization",
          operationId: "kilo.organization.set",
          responses: {
            200: {
              description: "Organization updated successfully",
              content: {
                "application/json": {
                  schema: resolver(z.boolean()),
                },
              },
            },
            ...errors(400, 401),
          },
        }),
        validator(
          "json",
          z.object({
            organizationId: z.string().nullable(),
          }),
        ),
        async (c: any) => {
          const { organizationId } = c.req.valid("json")

          // Get current Kilo auth
          const auth = await Auth.get("kilo")

          if (!auth || auth.type !== "oauth") {
            return c.json({ error: "Not authenticated with Kilo Gateway" }, 401)
          }

          // Update auth with new organization ID
          await Auth.set("kilo", {
            type: "oauth",
            refresh: auth.refresh,
            access: auth.access,
            expires: auth.expires,
            ...(organizationId && { accountId: organizationId }),
          })

          return c.json(true)
        },
      ),
  )
}
