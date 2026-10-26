# Applicant screening agent

A Google ADK agent that scores HackPSU applications against a rubric and returns structured evidence for human reviewers. It does not make admission decisions.

- `agent.py`: the `root_agent`. Model calls are pinned to the `global` location by `GlobalGemini`.
- `instructions.md`: the system instruction. Edit and review it here; `agent.py` loads it at import.
- `schemas.py`: the Pydantic output schema. Responses always match `ScreeningResult`.
- `rubric.example.json`: placeholder rubric. The rubric is sent with every request, not baked into the agent.

The API side lives in `src/modules/applicant-score/`. `applicant-screening-input.ts` builds the request, and `agent-engine.client.ts` calls the deployed agent. If you change `schemas.py`, update `applicant-screening.types.ts` and `applicant-screening.parser.ts` to match.

## Request format

The API sends a single user message containing the rubric as JSON plus the applicant's answers, each wrapped in delimiters:

```
<rubric>
{ ...rubric JSON... }
</rubric>

<application applicant_id="...">
<applicant_answer field="project">
...
</applicant_answer>
...
</application>
```

Only `applicant_id`, `project`, `expectations`, `excitement`, and `codingExperience` are sent. University, major, academic year, name, email, and resumes are never sent to the model.

## Local setup

Requires Python 3.10+ and a GCP project with Vertex AI enabled.

```bash
cd agents
python3 -m venv .venv
source .venv/bin/activate
pip install -r applicant_screening/requirements.txt

gcloud auth application-default login
cp applicant_screening/.env.example applicant_screening/.env   # then fill in your project
```

## Run locally

Run these from the `agents/` directory, the parent of the agent folder.

```bash
# Web UI at http://localhost:8000
adk web

# Or in the terminal
adk run applicant_screening
```

Paste a message in the request format above. You can use `rubric.example.json` as the rubric.

## Deploy to Agent Engine

Do not deploy from a laptop without checking with the tech team first. Deploying creates billable GCP resources.

```python
import vertexai
from vertexai import agent_engines

from applicant_screening.agent import root_agent

vertexai.init(
    project="YOUR_PROJECT",
    location="us-central1",            # Agent Engine region
    staging_bucket="gs://YOUR_STAGING_BUCKET",
)

app = agent_engines.AdkApp(agent=root_agent)

remote = agent_engines.create(
    agent_engine=app,
    display_name="hackpsu-applicant-screening",
    requirements=[
        "google-adk",
        "google-cloud-aiplatform[agent_engines,adk]",
        "pydantic>=2.0",
    ],
    extra_packages=["applicant_screening"],
)
print(remote.resource_name)  # projects/.../locations/.../reasoningEngines/<ID>
```

To ship a new version of the same engine, use `agent_engines.update(resource_name=..., agent_engine=app, ...)`.

Then set the following on the API (see `src/common/config/agent-engine.config.ts`):

| Variable | Value |
| --- | --- |
| `AGENT_ENGINE_PROJECT_ID` | GCP project of the engine |
| `AGENT_ENGINE_LOCATION` | Engine region, e.g. `us-central1` |
| `AGENT_ENGINE_RESOURCE_ID` | The `<ID>` at the end of `resource_name` |
| `AGENT_ENGINE_TIMEOUT_MS` | Optional. Defaults to `60000` |
| `ATS_RUBRIC_PATH` | Path to the rubric JSON the API sends |

The API's service account needs `roles/aiplatform.user` on the engine's project.

## Quick check after deploying

```python
async for event in remote.async_stream_query(user_id="manual-test", message=MESSAGE):
    print(event)
```

The last event's `content.parts[0].text` is the JSON result.
