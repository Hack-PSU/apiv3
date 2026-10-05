import { registerAs } from "@nestjs/config";
import { ConfigToken } from "common/config/config.constants";

export type AgentEngineConfig = {
  projectId?: string;
  // Region of the Agent Engine instance. The agent itself routes model calls
  // to the `global` location.
  location?: string;
  resourceId?: string;
  timeoutMs: number;
  rubricPath?: string;
};

export const agentEngineConfig = registerAs<AgentEngineConfig>(
  ConfigToken.AGENT_ENGINE,
  () => ({
    projectId: process.env.AGENT_ENGINE_PROJECT_ID,
    location: process.env.AGENT_ENGINE_LOCATION,
    resourceId: process.env.AGENT_ENGINE_RESOURCE_ID,
    timeoutMs: parseInt(process.env.AGENT_ENGINE_TIMEOUT_MS) || 60000,
    rubricPath: process.env.ATS_RUBRIC_PATH,
  }),
);
