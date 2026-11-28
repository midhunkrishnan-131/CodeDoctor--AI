#!/usr/bin/env python3
"""
CodeDoctor AI - Python Code Execution Engine
Provides process isolation, resource limits, timeouts, and execution metrics.
"""
import sys
import os
import time
import json
import tempfile
import subprocess
import traceback
import shutil

MAX_OUTPUT_CHARS = 50000
DEFAULT_TIMEOUT_SEC = 5.0

def execute_python_code(
    code: str,
    timeout: float = DEFAULT_TIMEOUT_SEC,
    stdin_input: str = "",
    filename: str = "solution.py",
    files: dict = None
) -> dict:
    start_time = time.perf_counter()
    
    # Quick syntax pre-check using compile
    try:
        compile(code, "<script>", "exec")
        syntax_ok = True
        syntax_error = None
    except SyntaxError as e:
        syntax_ok = False
        syntax_error = {
            "type": type(e).__name__,
            "message": str(e.msg),
            "line": e.lineno,
            "offset": e.offset,
            "text": e.text.strip() if e.text else ""
        }

    temp_dir = tempfile.mkdtemp(prefix="codedoctor_exec_")
    target_filename = os.path.basename(filename).strip() or "solution.py"
    script_path = os.path.join(temp_dir, target_filename)
    
    try:
        # Write all accompanying files if provided
        if files and isinstance(files, dict):
            for fname, fcontent in files.items():
                clean_name = os.path.basename(fname).strip()
                if clean_name and clean_name != target_filename:
                    fpath = os.path.join(temp_dir, clean_name)
                    with open(fpath, "w", encoding="utf-8") as f:
                        f.write(fcontent or "")

        # Always write the main target file with current editor code
        with open(script_path, "w", encoding="utf-8") as f:
            f.write(code)

        # Pre-exec isolation function for Linux resource limits
        def set_limits():
            try:
                import resource
                # 8 seconds CPU limit
                cpu_limit = int(timeout) + 2
                resource.setrlimit(resource.RLIMIT_CPU, (cpu_limit, cpu_limit + 1))
                # 256MB memory limit
                mem_bytes = 256 * 1024 * 1024
                resource.setrlimit(resource.RLIMIT_AS, (mem_bytes, mem_bytes))
            except Exception:
                pass

        # Execute using separate python subprocess
        proc = subprocess.Popen(
            [sys.executable, "-u", script_path],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=temp_dir,
            text=True,
            preexec_fn=set_limits if os.name != 'nt' else None
        )

        try:
            stdout_data, stderr_data = proc.communicate(
                input=stdin_input or "",
                timeout=timeout
            )
            timed_out = False
        except subprocess.TimeoutExpired:
            proc.kill()
            stdout_data, stderr_data = proc.communicate()
            timed_out = True
            stderr_data += f"\n[CodeDoctor AI]: Execution timed out after {timeout} seconds. Check for infinite loops or blocking operations."

        exec_time = time.perf_counter() - start_time
        exit_code = -1 if timed_out else proc.returncode

        # Truncate output if excessively large
        if len(stdout_data) > MAX_OUTPUT_CHARS:
            stdout_data = stdout_data[:MAX_OUTPUT_CHARS] + f"\n... [Output truncated after {MAX_OUTPUT_CHARS} chars]"
        if len(stderr_data) > MAX_OUTPUT_CHARS:
            stderr_data = stderr_data[:MAX_OUTPUT_CHARS] + f"\n... [Stderr truncated after {MAX_OUTPUT_CHARS} chars]"

        # Detect error category
        error_type = None
        if timed_out:
            error_type = "TimeoutError"
        elif exit_code != 0:
            if "SyntaxError" in stderr_data or "IndentationError" in stderr_data:
                error_type = "SyntaxError"
            elif "ZeroDivisionError" in stderr_data:
                error_type = "ZeroDivisionError"
            elif "IndexError" in stderr_data:
                error_type = "IndexError"
            elif "KeyError" in stderr_data:
                error_type = "KeyError"
            elif "RecursionError" in stderr_data:
                error_type = "RecursionError"
            elif "NameError" in stderr_data:
                error_type = "NameError"
            elif "TypeError" in stderr_data:
                error_type = "TypeError"
            elif "AttributeError" in stderr_data:
                error_type = "AttributeError"
            elif "ValueError" in stderr_data:
                error_type = "ValueError"
            else:
                error_type = "RuntimeError"

        return {
            "success": exit_code == 0 and not timed_out,
            "stdout": stdout_data,
            "stderr": stderr_data,
            "exit_code": exit_code,
            "execution_time_ms": round(exec_time * 1000, 2),
            "timed_out": timed_out,
            "error_type": error_type,
            "syntax_valid": syntax_ok,
            "syntax_error": syntax_error
        }

    except Exception as exc:
        exec_time = time.perf_counter() - start_time
        return {
            "success": False,
            "stdout": "",
            "stderr": f"Execution Engine Error: {str(exc)}\n{traceback.format_exc()}",
            "exit_code": -1,
            "execution_time_ms": round(exec_time * 1000, 2),
            "timed_out": False,
            "error_type": "EngineError",
            "syntax_valid": syntax_ok if 'syntax_ok' in locals() else False,
            "syntax_error": syntax_error if 'syntax_error' in locals() else None
        }
    finally:
        # Cleanup temp directory
        try:
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir, ignore_errors=True)
        except Exception:
            pass

if __name__ == "__main__":
    try:
        if len(sys.argv) > 1 and sys.argv[1] == "--self-test":
            test_res = execute_python_code("print('Hello from CodeDoctor AI execution engine!')\nprint(2 + 2)")
            print(json.dumps(test_res, indent=2))
        elif not sys.stdin.isatty():
            input_data = sys.stdin.read()
            if input_data.strip():
                payload = json.loads(input_data)
                code = payload.get("code", "")
                timeout = float(payload.get("timeout", DEFAULT_TIMEOUT_SEC))
                stdin_val = payload.get("stdin", "")
                result = execute_python_code(code, timeout, stdin_val)
                print(json.dumps(result))
            else:
                test_res = execute_python_code("print('Hello from CodeDoctor AI execution engine!')")
                print(json.dumps(test_res, indent=2))
        else:
            test_res = execute_python_code("print('Hello from CodeDoctor AI execution engine!')\nprint(2 + 2)")
            print(json.dumps(test_res, indent=2))
    except Exception as e:
        print(json.dumps({"success": False, "stderr": str(e), "exit_code": -1}))
