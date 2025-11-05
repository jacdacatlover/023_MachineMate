---
description: Help commit and push changes to GitHub with a good commit message
---

You are helping the user commit their changes to git and push to GitHub.

Follow these steps:

1. **Check git status** - Run `git status` to see what files changed

2. **Analyze the changes** - Review the changes to understand what was modified. Use `git diff` on a few key files if needed to understand the changes better.

3. **Suggest a commit message** - Create a clear, descriptive commit message following these rules:
   - Use imperative mood: "Add feature" not "Added feature"
   - Be specific: "Fix camera permission bug" not "Fix bug"
   - First line: Brief summary (50 chars or less)
   - Optional: Add blank line then bullet points for details
   - Common prefixes: Add, Update, Fix, Refactor, Remove, Docs, Style, Test, Chore

4. **Ask for approval** - Present your suggested message and ask:
   ```
   I suggest this commit message:

   [Your message here]

   Is this good? (Reply 'yes' to proceed, or provide your own message)
   ```

5. **Wait for user response** - Do NOT proceed until user approves or provides alternative

6. **Stage and commit** - Once approved:
   - Stage files with `git add` (skip .DS_Store, node_modules, build artifacts)
   - Create commit with approved message
   - Push to GitHub with `git push`
   - Confirm success

**Important:**
- Never commit node_modules/, .DS_Store, .env, or build files
- Always ask before pushing
- If there are errors, explain them clearly
- Write clear, specific commit messages

Now check the git status and help the user commit their changes!
