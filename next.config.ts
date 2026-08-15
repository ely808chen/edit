import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  serverExternalPackages: ["@openai/agents", "@openai/agents-core"],
}

export default nextConfig
