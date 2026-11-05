# Contributing to Project Triage

Thank you for your interest in contributing to **Project Triage**! This project provides AI-assisted tactical decision support for emergency search-and-rescue (SAR) aerial reconnaissance.

We welcome contributions from developers, researchers, and emergency response technologists.

---

## Core Philosophy & Safety Principles

Before submitting code, please keep our core life-safety design principles in mind:

1. **Human-in-the-Loop:** Project Triage is a decision-support tool. It flags and prioritizes visual candidates; human operators make all tactical and dispatch decisions.
2. **Zero-Dismissal Protocol:** In safety-critical SAR workflows, false dismissals can cost human lives. Ambiguous or low-confidence signals must be elevated for manual human review, never silently discarded.
3. **No Fabricated Data:** Evaluation and testing use simulated or academic benchmark datasets only. Never upload or distribute footage depicting actual disaster victims or casualties.

---

## Development Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Meta Model API Key**: Access to Meta SAM 3.1 and Muse Spark 1.3 endpoints

### Installation & Build

1. **Fork and clone** the repository:
   ```bash
   git clone https://github.com/<your-username>/triage.git
   cd triage
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Add your META_MODEL_API_KEY and configure endpoints in .env
   ```

3. **Install dependencies and build**:
   ```bash
   npm run install:all
   npm run build
   ```

4. **Run the local development stack**:
   - Production bundle mode:
     ```bash
     npm start
     ```
   - Concurrent watch mode (separate backend & Vite dev server):
     ```bash
     npm run dev:backend    # Runs backend on port 4000
     npm run dev:frontend   # Runs Vite on port 5173 with proxy
     ```

5. **Instant Reset**:
   Wipe test jobs, candidates, and cached media to return to a clean slate:
   ```bash
   npm run reset
   ```

---

## Submitting Pull Requests

1. **Create a topic branch**:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. **Verify tests and builds pass cleanly**:
   ```bash
   npm test
   npm run build
   ```
3. **Commit with conventional commit messages**:
   - `feat(...)`: New feature or capability
   - `fix(...)`: Bug fix or patch
   - `refactor(...)`: Code restructuring without behavioral change
   - `docs(...)`: Documentation improvements
4. **Push your branch and open a Pull Request**:
   - Provide a clear summary of what your change solves.
   - Include screenshots or recordings for UI changes.
   - Ensure no credentials, API keys, or temporary files are included.

---

## License

By contributing to Project Triage, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).
