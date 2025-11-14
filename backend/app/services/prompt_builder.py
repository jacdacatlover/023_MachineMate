"""
Prompt Builder for Machine Recognition VLM

This module provides three different prompt variants for A/B testing
machine recognition accuracy:

- Variant A (enhanced_baseline): Enhanced prompt with visual feature descriptions
- Variant B (few_shot): Few-shot examples showing correct/incorrect identifications
- Variant C (chain_of_thought): Chain-of-thought reasoning before classification

Each variant is designed to reduce false identifications while maintaining
high confidence on correct predictions.
"""

from typing import Sequence, Dict, List, Optional, Any
from enum import Enum


class PromptVariant(str, Enum):
    """Available prompt variants for A/B testing"""
    ENHANCED_BASELINE = "enhanced_baseline"
    FEW_SHOT = "few_shot"
    CHAIN_OF_THOUGHT = "chain_of_thought"


class MachineMetadata:
    """Holds visual recognition metadata for a machine"""

    def __init__(
        self,
        name: str,
        visual_prompts: List[str],
        keywords: List[str],
        synonyms: List[str],
        category: str
    ):
        self.name = name
        self.visual_prompts = visual_prompts
        self.keywords = keywords
        self.synonyms = synonyms
        self.category = category

    @classmethod
    def from_machine_dict(cls, machine: Dict[str, Any]) -> "MachineMetadata":
        """Extract metadata from machine dictionary"""
        recognition = machine.get("recognition", {})
        return cls(
            name=machine["name"],
            visual_prompts=recognition.get("visualPrompts", []),
            keywords=recognition.get("keywords", []),
            synonyms=recognition.get("synonyms", []),
            category=machine.get("category", "Unknown")
        )


def extract_machine_metadata(machines: Sequence[Dict[str, Any]]) -> List[MachineMetadata]:
    """Extract visual metadata from machine catalog"""
    return [MachineMetadata.from_machine_dict(m) for m in machines]


def build_visual_features_guide(metadata_list: List[MachineMetadata]) -> str:
    """
    Build a comprehensive visual features guide organized by category.
    This helps the VLM understand distinguishing features for each machine type.
    """
    # Group by category
    by_category: Dict[str, List[MachineMetadata]] = {}
    for meta in metadata_list:
        if meta.category not in by_category:
            by_category[meta.category] = []
        by_category[meta.category].append(meta)

    guide_parts = ["Visual Features Guide by Category:\n"]

    for category, machines in sorted(by_category.items()):
        guide_parts.append(f"\n{category}:")
        for machine in machines:
            # Combine visual prompts and keywords
            features = []
            if machine.visual_prompts:
                features.extend(machine.visual_prompts)
            if machine.keywords:
                features.append(f"Key features: {', '.join(machine.keywords)}")

            if features:
                guide_parts.append(f"  - {machine.name}: {'; '.join(features)}")

    return "\n".join(guide_parts)


def build_enhanced_baseline_prompt(
    machine_options: Sequence[str],
    metadata_list: Optional[List[MachineMetadata]] = None
) -> str:
    """
    Variant A: Enhanced Baseline

    Improves the original prompt with:
    - Visual feature descriptions for each machine category
    - Explicit false positive reduction instructions
    - Calibrated confidence guidance
    - Structured visual analysis approach
    """
    joined_options = ", ".join(machine_options)

    # Build visual features guide if metadata provided
    visual_guide = ""
    if metadata_list:
        visual_guide = f"\n{build_visual_features_guide(metadata_list)}\n"

    return f"""You are an expert gym equipment identifier specializing in accurate machine recognition.

Task: Identify the gym machine in the photo from this exact list:
{joined_options}

{visual_guide}
Critical Rules for Accuracy:
1. ONLY identify a machine if you clearly see its distinctive features
2. Use EXACTLY one label from the list above - no modifications or new names
3. If no machine from the list is visible or identifiable, respond with {{"machine": "Unknown", "confidence": 0.0}}
4. If the image is too blurry, dark, or unclear to identify confidently, use "Unknown"
5. DO NOT guess - uncertainty should result in lower confidence or "Unknown"

Visual Analysis Approach:
- Look for key identifying features: footplates, handles, pads, cable systems, seat positions
- Consider the machine's orientation and angle in the photo
- Identify weight stack, sled, or resistance mechanism type
- Note the primary movement pattern (pressing, pulling, extension, rotation)

Confidence Calibration Guidelines:
- 0.9-1.0: Machine is clearly visible with all distinctive features identifiable
- 0.7-0.89: Machine is visible but some features are partially obscured
- 0.5-0.69: Likely this machine but missing clear visual confirmation
- 0.3-0.49: Uncertain, could be multiple machines
- 0.0-0.29: Cannot identify, unclear, or not in the list

Output Format:
Respond ONLY with valid JSON containing the machine name and confidence score:
{{"machine": "Machine Name", "confidence": 0.85}}

No markdown formatting, no explanations, no extra keys - just the JSON object."""


def build_few_shot_prompt(
    machine_options: Sequence[str],
    metadata_list: Optional[List[MachineMetadata]] = None
) -> str:
    """
    Variant B: Few-Shot Examples

    Provides concrete examples of:
    - Correct high-confidence identifications
    - Correct low-confidence (uncertain) responses
    - Correct "Unknown" responses for unclear images
    - Incorrect responses to avoid (false positives)
    """
    joined_options = ", ".join(machine_options)

    # Build visual features guide if metadata provided
    visual_guide = ""
    if metadata_list:
        visual_guide = f"\n{build_visual_features_guide(metadata_list)}\n"

    return f"""You are an expert gym equipment identifier. Your task is to identify gym machines accurately while avoiding false identifications.

Available machines to identify:
{joined_options}

{visual_guide}
Examples of Correct Responses:

Example 1 - Clear Identification (High Confidence):
Image: Clear photo showing large angled footplate, seated position with back pad, weight sled mechanism
Response: {{"machine": "Seated Leg Press", "confidence": 0.92}}
Why: All distinctive features clearly visible - angled footplate, sled system, seated position

Example 2 - Partial View (Medium Confidence):
Image: Side view of machine with overhead bar and cable system, knee pads visible
Response: {{"machine": "Lat Pulldown", "confidence": 0.68}}
Why: Can see cable system and overhead bar, but angle makes full identification uncertain

Example 3 - Uncertain Between Similar Machines (Low Confidence):
Image: Pressing machine visible but can't clearly distinguish if chest, shoulder, or incline press
Response: {{"machine": "Chest Press Machine", "confidence": 0.52}}
Why: It's a press machine but specific type is unclear from angle

Example 4 - No Match (Unknown):
Image: Shows dumbbell rack and free weights area
Response: {{"machine": "Unknown", "confidence": 0.0}}
Why: Image shows equipment not in the available machines list

Example 5 - Too Unclear (Unknown):
Image: Blurry photo taken from far away, can't make out specific machine features
Response: {{"machine": "Unknown", "confidence": 0.0}}
Why: Image quality too poor to make reliable identification

Critical Rules:
1. Use EXACTLY one label from the available machines list
2. If no machine from the list is clearly visible → "Unknown" with confidence 0.0
3. If image is too blurry, dark, or unclear → "Unknown" with confidence 0.0
4. Confidence should reflect your certainty about the identification
5. When uncertain between similar machines, pick the most likely but use lower confidence (0.4-0.6)

Output Format:
Respond ONLY with valid JSON:
{{"machine": "Machine Name", "confidence": 0.75}}

No markdown, no explanations, no additional keys."""


def build_chain_of_thought_prompt(
    machine_options: Sequence[str],
    metadata_list: Optional[List[MachineMetadata]] = None
) -> str:
    """
    Variant C: Chain-of-Thought Reasoning

    Asks the VLM to:
    1. First describe what it observes in the image
    2. Match observed features to machine types
    3. Make a final decision with confidence
    4. Output structured JSON with reasoning

    Note: This variant uses more tokens but may provide higher accuracy
    and allows for reasoning validation.
    """
    joined_options = ", ".join(machine_options)

    # Build visual features guide if metadata provided
    visual_guide = ""
    if metadata_list:
        visual_guide = f"\n{build_visual_features_guide(metadata_list)}\n"

    return f"""You are an expert gym equipment identifier. Use careful step-by-step reasoning to accurately identify machines.

Available machines:
{joined_options}

{visual_guide}
Step-by-Step Identification Process:

Step 1: Describe what you observe
First, describe the visual features you see in the image:
- What is the primary structure? (seat, bench, platform, frame)
- What movement components are visible? (handles, bars, pads, cables, foot plates)
- What is the resistance mechanism? (weight stack, sled, cables, plates)
- What is the body position? (seated, lying, standing)
- What movement pattern does it suggest? (pushing, pulling, extending, rotating)

Step 2: Match features to machine types
Based on your observations:
- Which machines from the list match these features?
- What are the key distinguishing features that narrow it down?
- Are there any features that rule out certain machines?
- If multiple machines could match, what features would distinguish them?

Step 3: Assess image quality and visibility
- Is the image clear enough to make a confident identification?
- Are the key distinguishing features visible?
- Could this be a machine not in the list?
- Is there any ambiguity or uncertainty?

Step 4: Make final decision
- Based on the above analysis, which machine is it?
- How confident are you? (consider image quality, feature visibility, and distinctiveness)
- If uncertain or no match, should this be "Unknown"?

Critical Rules:
1. If you cannot clearly see distinctive features → "Unknown"
2. If the machine is not in the available list → "Unknown"
3. If the image is too blurry, dark, or unclear → "Unknown"
4. Use EXACTLY one label from the list (or "Unknown")
5. Confidence should reflect genuine certainty, not guessing

Final Output Format:
After your reasoning, provide ONLY the final answer as valid JSON:
{{"machine": "Machine Name", "confidence": 0.80}}

Think through each step, then output only the JSON."""


def build_prompt(
    machine_options: Sequence[str],
    variant: PromptVariant = PromptVariant.ENHANCED_BASELINE,
    machine_metadata: Optional[Sequence[Dict[str, Any]]] = None
) -> str:
    """
    Main prompt builder that selects the appropriate variant.

    Args:
        machine_options: List of machine names to identify from
        variant: Which prompt variant to use (for A/B testing)
        machine_metadata: Optional full machine catalog with recognition metadata

    Returns:
        Formatted prompt string for the VLM
    """
    # Extract metadata if provided
    metadata_list = None
    if machine_metadata:
        metadata_list = extract_machine_metadata(machine_metadata)

    # Select prompt builder based on variant
    if variant == PromptVariant.ENHANCED_BASELINE:
        return build_enhanced_baseline_prompt(machine_options, metadata_list)
    elif variant == PromptVariant.FEW_SHOT:
        return build_few_shot_prompt(machine_options, metadata_list)
    elif variant == PromptVariant.CHAIN_OF_THOUGHT:
        return build_chain_of_thought_prompt(machine_options, metadata_list)
    else:
        # Fallback to enhanced baseline
        return build_enhanced_baseline_prompt(machine_options, metadata_list)


# Convenience function to get all variant names
def get_available_variants() -> List[str]:
    """Returns list of all available prompt variant names"""
    return [v.value for v in PromptVariant]
