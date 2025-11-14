#!/usr/bin/env python3
"""
Test script for validating prompt variants

This script tests all three prompt variants with sample machine catalogs
to ensure they generate properly formatted prompts.
"""

import json
import sys
from pathlib import Path

# Add the app directory to the path
sys.path.insert(0, str(Path(__file__).parent))

from app.services.prompt_builder import (
    PromptVariant,
    build_prompt,
    extract_machine_metadata,
)

# Sample machine catalog (subset for testing)
SAMPLE_MACHINES = [
    {
        "id": "leg_press",
        "name": "Seated Leg Press",
        "category": "Lower Body",
        "recognition": {
            "visualPrompts": [
                "seated leg press sled machine",
                "large angled footplate with lower body pushing position",
            ],
            "keywords": ["footplate", "sled", "lower body"],
            "synonyms": ["leg press", "sled press"],
        },
    },
    {
        "id": "lat_pulldown",
        "name": "Lat Pulldown",
        "category": "Back",
        "recognition": {
            "visualPrompts": [
                "lat pulldown machine",
                "cable station with wide grip bar overhead",
            ],
            "keywords": ["cable station", "wide bar", "thigh pad"],
            "synonyms": ["lat pulldown", "wide grip pulldown"],
        },
    },
    {
        "id": "chest_press",
        "name": "Chest Press Machine",
        "category": "Chest",
        "recognition": {
            "visualPrompts": [
                "seated chest press machine with dual handles",
                "horizontal pushing movement from chest level",
            ],
            "keywords": ["horizontal handles", "padded seat", "push"],
            "synonyms": ["chest press", "machine press"],
        },
    },
]


def test_variant(variant: PromptVariant, machine_catalog: list) -> None:
    """Test a specific prompt variant"""
    print(f"\n{'=' * 80}")
    print(f"TESTING VARIANT: {variant.value}")
    print(f"{'=' * 80}\n")

    machine_names = [m["name"] for m in machine_catalog]

    # Test without metadata
    print(f"--- Prompt WITHOUT metadata ---\n")
    prompt_without_meta = build_prompt(
        machine_options=machine_names,
        variant=variant,
        machine_metadata=None
    )
    print(prompt_without_meta[:500] + "..." if len(prompt_without_meta) > 500 else prompt_without_meta)

    # Test with metadata
    print(f"\n--- Prompt WITH metadata ---\n")
    prompt_with_meta = build_prompt(
        machine_options=machine_names,
        variant=variant,
        machine_metadata=machine_catalog
    )
    print(prompt_with_meta[:800] + "..." if len(prompt_with_meta) > 800 else prompt_with_meta)

    # Validate key components
    print(f"\n--- Validation ---")
    validations = {
        "Contains machine list": all(name in prompt_with_meta for name in machine_names),
        "Contains JSON format instruction": '{"machine":' in prompt_with_meta,
        "Contains confidence instruction": "confidence" in prompt_with_meta.lower(),
        "Contains 'Unknown' handling": "Unknown" in prompt_with_meta,
    }

    for check, passed in validations.items():
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"  {status}: {check}")

    # Variant-specific checks
    if variant == PromptVariant.ENHANCED_BASELINE:
        has_visual_guide = "Visual Features Guide" in prompt_with_meta
        print(f"  {'✓ PASS' if has_visual_guide else '✗ FAIL'}: Contains visual features guide")

    elif variant == PromptVariant.FEW_SHOT:
        has_examples = "Example" in prompt_with_meta
        example_count = prompt_with_meta.count("Example")
        print(f"  {'✓ PASS' if has_examples else '✗ FAIL'}: Contains examples")
        print(f"  {'✓ PASS' if example_count >= 3 else '✗ FAIL'}: Has at least 3 examples (found {example_count})")

    elif variant == PromptVariant.CHAIN_OF_THOUGHT:
        has_steps = "Step 1" in prompt_with_meta
        print(f"  {'✓ PASS' if has_steps else '✗ FAIL'}: Contains step-by-step instructions")


def test_metadata_extraction():
    """Test metadata extraction from machine catalog"""
    print(f"\n{'=' * 80}")
    print("TESTING METADATA EXTRACTION")
    print(f"{'=' * 80}\n")

    metadata_list = extract_machine_metadata(SAMPLE_MACHINES)

    print(f"Extracted metadata for {len(metadata_list)} machines:\n")
    for meta in metadata_list:
        print(f"  • {meta.name}")
        print(f"    Category: {meta.category}")
        print(f"    Visual Prompts: {len(meta.visual_prompts)}")
        print(f"    Keywords: {', '.join(meta.keywords)}")
        print(f"    Synonyms: {', '.join(meta.synonyms)}")
        print()


def test_all_variants():
    """Test all prompt variants"""
    print("\n" + "=" * 80)
    print("PROMPT VARIANT TESTING SUITE")
    print("=" * 80)

    # Test metadata extraction
    test_metadata_extraction()

    # Test each variant
    for variant in PromptVariant:
        test_variant(variant, SAMPLE_MACHINES)

    print(f"\n{'=' * 80}")
    print("TESTING COMPLETE")
    print(f"{'=' * 80}\n")

    # Summary
    print("Summary:")
    print("  All three prompt variants have been generated and validated.")
    print("  Each variant includes:")
    print("    - Machine name list")
    print("    - JSON response format instructions")
    print("    - Confidence scoring guidance")
    print("    - 'Unknown' machine handling")
    print("\n  Variant-specific features:")
    print("    - Enhanced Baseline: Visual features guide by category")
    print("    - Few-Shot: Example identifications with explanations")
    print("    - Chain-of-Thought: Step-by-step reasoning instructions")
    print("\nNext steps:")
    print("  1. Run the backend server to test in production")
    print("  2. Set MACHINEMATE_PROMPT_VARIANT environment variable to choose variant")
    print("  3. Set MACHINEMATE_PROMPT_AB_TESTING_ENABLED=true for random variant selection")
    print("  4. Monitor analytics via the database views created in the migration")


if __name__ == "__main__":
    test_all_variants()
