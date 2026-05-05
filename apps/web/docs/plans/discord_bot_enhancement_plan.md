# Discord Bot Enhancement Plan (Revised)

## Objective
Align the Discord Bot's capabilities with the project's vision, focusing on intelligence and multi-channel support for the listener, without implementing the feedback loop (Discord delivery) at this stage.

## Mismatches Identified
1. **Dynamic Routing Support**: The current logic relies on hardcoded configurations in some places.
2. **Channel-Specific Rules**: The system needs more granular control over which channels trigger which actions.
3. **Routine Extraction Optimization**: Improving the reliability of schedule change detection via Gemini.
4. **Listener Stabilization**: Ensuring the listener can handle high-volume messages across multiple channels without loss.

## Implementation Phases

### Phase 1: Listener Intelligence Upgrade
- **Advanced OCR**: Improve image context extraction in `classifier.ts`.
- **Course Mapping Refinement**: Enhance the `detectCourseCodeFromText` logic to handle variations in university course naming conventions.
- **Batched Message Context**: Ensure the batcher preserves the sequence of files and text for more accurate AI summaries.

### Phase 2: Dynamic Bot Configuration
- **API Integration**: Finalize the link between the listener and the web app's `/api/v1/internal/bot-config` endpoint.
- **Runtime Refresh**: Implement hot-reloading of channel rules without requiring a service restart.

### Phase 3: Routine Alerting Logic
- **Structured Extraction**: Refine the `RoutineOverrideExtract` interface to include fields like `targetGroup` and `parity` to match the new routine system.
- **Auto-linking**: Ensure extracted overrides are accurately linked to existing `BaseRoutine` entries in the database.

## Exclusions
- **Final Discord Delivery**: Automated posting of final announcement embeds back to Discord channels is EXCLUDED from this plan as per user request.

---
*Created by Antigravity AI on 2026-05-06.*
