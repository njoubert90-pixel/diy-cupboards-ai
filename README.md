# Panda Kitchens DIY Cupboards

## Requirements

- Windows
- Python 3.11 or newer
- Node.js and npm

## First-time setup

From the project root, double-click `install.bat`, or run:

```powershell
.\install.bat
```

This creates the `.venv` Python environment, installs the backend dependencies, and
installs the frontend dependencies in `ui\node_modules`.

## Start development

The recommended command starts both the FastAPI backend and the React/Vite
frontend:

```powershell
.\start-dev.bat
```

The script opens the application automatically at
[http://localhost:5173](http://localhost:5173).

To start the services manually instead:

```powershell
# Terminal 1 - backend
.\.venv\Scripts\python.exe -m uvicorn main:app --reload

# Terminal 2 - frontend
Set-Location ui
npm.cmd run dev
```

You can also use the Python launcher, which starts both services and opens the
application in your browser:

```powershell
.\.venv\Scripts\python.exe launcher.py
```

Press `Ctrl+C` to stop the Python launcher and both development services.

The frontend also provides a combined development command. Run it from the
`ui` directory:

```powershell
Set-Location ui
npm.cmd run dev:full
```

### VS Code tasks

If you are working in VS Code, open the Command Palette with `Ctrl+Shift+P`,
select **Tasks: Run Task**, and choose one of:

- **Start FastAPI** - starts only the backend
- **Start Vite** - starts only the frontend
- **Start development servers** - starts both services

The API documentation is available at
[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

## Frontend commands

Run these commands from the `ui` directory:

```powershell
Set-Location ui

# Start the Vite development server
npm.cmd run dev

# Create a production build in ui\dist
npm.cmd run build

# Check the frontend with ESLint
npm.cmd run lint

# Preview the most recent production build
npm.cmd run preview
```

## Stop development

Double-click `stop-dev.bat`, or run:

```powershell
.\stop-dev.bat
```

This terminates the running `python.exe` and `node.exe` processes.

## GitHub and VS Code Source Control

VS Code uses the repository's Git remote for push and pull. To use the GitHub
account associated with your SSH key, set the remote to SSH:

```powershell
git remote set-url origin git@github.com:YOUR_USERNAME/YOUR_REPOSITORY.git
```

Verify the key and account:

```powershell
ssh -T git@github.com
```

The response should identify the intended GitHub username. Configure the author
identity used for commits in this repository:

```powershell
git config user.name "Your Name"
git config user.email "your-github-email@example.com"
```

Check the current remote and commit identity with:

```powershell
git remote -v
git config --local --list
```

The VS Code **Accounts** sign-in controls GitHub features such as pull requests
and issues, while the SSH key authenticates Git fetch, push, and pull.
