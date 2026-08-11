import os
import subprocess

if __name__ == "__main__":
    env = os.environ.copy()
    env["DATABASE_URL"] = "sqlite:///db.sqlite3"
    env["PYTHONIOENCODING"] = "utf-8"

    cmd = [
        "python", "manage.py", "dumpdata",
        "--natural-foreign", "--natural-primary",
        "-e", "contenttypes", "-e", "auth.permission",
        "--indent", "2"
    ]

    print("Running dumpdata via subprocess...")
    try:
        result = subprocess.run(cmd, env=env, capture_output=True, text=True, encoding="utf-8")
        if result.returncode == 0:
            with open("sqlite_backup_final.json", "w", encoding="utf-8") as f:
                f.write(result.stdout)
            print("Successfully saved to sqlite_backup_final.json")
        else:
            print("Error running dumpdata:")
            print(result.stderr)
    except Exception as e:
        print(f"Exception occurred: {e}")
