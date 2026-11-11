"""
CodeDoctor AI - Response Handler
Parses AI markdown output, extracts Python code blocks, validates logic constraints.
"""
import re
from typing import Dict, Any, List, Optional

def extract_python_code(markdown_text: str) -> Optional[str]:
    """Extract the primary python code block from markdown response."""
    python_blocks = re.findall(r"```(?:python|py)\s*\n([\s\S]*?)```", markdown_text, re.IGNORECASE)
    if python_blocks:
        # Sort by length and pick the most complete implementation
        sorted_blocks = sorted([b.strip() for b in python_blocks], key=len, reverse=True)
        return sorted_blocks[0]
        
    generic_blocks = re.findall(r"```\s*\n([\s\S]*?)```", markdown_text)
    for b in generic_blocks:
        content = b.strip()
        if "def " in content or "import " in content or "return " in content:
            return content
    return None

def parse_diagnosis_response(raw_text: str, mode: str) -> Dict[str, Any]:
    """Structure the diagnosis response into sections based on mode."""
    cleaned_text = raw_text.strip()
    code_snippet = extract_python_code(cleaned_text)
    
    # If mode is logic_suggestion and AI leaked complete code, flag it or suppress
    is_logic_mode = "logic" in mode.lower()
    
    sections = []
    current_section = {"title": "Overview", "content": ""}
    
    for line in cleaned_text.splitlines():
        heading_match = re.match(r"^(#{1,3})\s+(.+)$", line)
        if heading_match:
            if current_section["content"].strip():
                sections.append(current_section)
            current_section = {
                "title": heading_match.group(2).strip(),
                "content": ""
            }
        else:
            current_section["content"] += line + "\n"
            
    if current_section["content"].strip():
        sections.append(current_section)
        
    return {
        "raw_text": cleaned_text,
        "mode": mode,
        "sections": sections,
        "extracted_code": code_snippet if not is_logic_mode else None,
        "has_corrected_code": bool(code_snippet and not is_logic_mode),
        "is_logic_mode": is_logic_mode
    }
