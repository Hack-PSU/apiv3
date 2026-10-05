from functools import cached_property
from pathlib import Path

from google.adk.agents import LlmAgent
from google.adk.agents.readonly_context import ReadonlyContext
from google.adk.models import Gemini
from google.genai import Client

from .schemas import ScreeningResult

_INSTRUCTIONS = (Path(__file__).parent / "instructions.md").read_text(
    encoding="utf-8"
)


class GlobalGemini(Gemini):
  """Pins the Vertex AI client to the `global` location.

  gemini-3 series models are only served from `global`; the default ADK
  `Gemini` integration constructs a `google.genai.Client` whose location
  defaults to the AgentEngine instance's region (e.g. `us-central1`) and
  fails with model-not-found for these models. Subclassing per the override
  pattern documented on `google.adk.models.google_llm.Gemini` lets the agent
  keep running in its regional AgentEngine instance while routing the model
  request to the global endpoint.
  """

  @cached_property
  def api_client(self) -> Client:
    return Client(vertexai=True, location="global")


def _instruction(_: ReadonlyContext) -> str:
  # Returned from a provider rather than passed as a string so ADK does not
  # treat `{...}` in instructions.md as session-state placeholders.
  return _INSTRUCTIONS


root_agent = LlmAgent(
  name='hackpsu_screening_dev',
  model=GlobalGemini(model='gemini-3.5-flash'),
  description=(
      'Reviews applications against a supplied HackPSU rubric and produces evidence for human reviewers.'
  ),
  sub_agents=[],
  instruction=_instruction,
  output_schema=ScreeningResult,
  # output_schema agents cannot use tools or transfer control.
  disallow_transfer_to_parent=True,
  disallow_transfer_to_peers=True,
  tools=[],
)
