"""
One-shot CLI to create/manage admin users in the SQLite auth DB.

Usage:
    cd src
    python create_admin.py create <username> <password>
    python create_admin.py list
    python create_admin.py deactivate <username>
    python create_admin.py activate <username>
    python create_admin.py change-password <username> <new_password>
    python create_admin.py delete <username>
"""

import asyncio
import sys


async def main() -> None:
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(1)

    from shared.auth import (
        change_password,
        create_admin_user,
        delete_admin_user,
        init_db,
        list_admin_users,
        set_user_active,
    )

    await init_db()
    cmd = args[0]

    if cmd == "create":
        if len(args) < 3:
            print("Usage: python create_admin.py create <username> <password>")
            sys.exit(1)
        user = await create_admin_user(args[1], args[2])
        print(f"Created admin user: {user['username']}  (id={user['id']})")

    elif cmd == "list":
        users = await list_admin_users()
        if not users:
            print("No admin users found.")
        for u in users:
            status = "active" if u["is_active"] else "INACTIVE"
            print(f"  [{u['id']}] {u['username']}  ({status})  created={u['created_at']}")

    elif cmd == "deactivate":
        if len(args) < 2:
            print("Usage: python create_admin.py deactivate <username>")
            sys.exit(1)
        await set_user_active(args[1], False)
        print(f"Deactivated: {args[1]}")

    elif cmd == "activate":
        if len(args) < 2:
            print("Usage: python create_admin.py activate <username>")
            sys.exit(1)
        await set_user_active(args[1], True)
        print(f"Activated: {args[1]}")

    elif cmd == "change-password":
        if len(args) < 3:
            print("Usage: python create_admin.py change-password <username> <new_password>")
            sys.exit(1)
        await change_password(args[1], args[2])
        print(f"Password updated for: {args[1]}")

    elif cmd == "delete":
        if len(args) < 2:
            print("Usage: python create_admin.py delete <username>")
            sys.exit(1)
        confirm = input(f"Delete admin '{args[1]}'? [y/N] ")
        if confirm.lower() == "y":
            await delete_admin_user(args[1])
            print(f"Deleted: {args[1]}")
        else:
            print("Aborted.")

    else:
        print(f"Unknown command: {cmd}")
        print(__doc__)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
