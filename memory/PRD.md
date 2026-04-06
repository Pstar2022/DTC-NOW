# PC Efficiency Manager - PRD

## Original Problem Statement
Build me an app that keeps my PC running at peak efficiency - A task/process manager with tips for improving performance; A desktop utility with system optimization recommendations.

## User Choices
- All features: Real-time monitoring (CPU, RAM, disk, network), optimization tips and recommendations, task scheduler for maintenance routines
- AI-powered features using OpenAI GPT-5.2 (Emergent LLM key)
- No authentication needed
- No specific design preferences (used dark Control Room theme)

## Architecture
- **Frontend**: React with Tailwind CSS, Recharts, Phosphor Icons
- **Backend**: FastAPI with MongoDB
- **AI**: OpenAI GPT-5.2 via emergentintegrations library
- **Theme**: Dark Control Room aesthetic (#050505 background, #00FF66 accent)

## Core Requirements
1. Real-time system monitoring (CPU, RAM, Disk, Network, Temperature)
2. System Health Score with breakdown
3. AI-powered optimization recommendations
4. Process Manager with kill functionality
5. Task Scheduler for maintenance routines
6. Performance Tips section

## What's Been Implemented (2026-04-06)
- [x] Real-time metrics dashboard with live charts
- [x] System Health Score widget (0-100 scale)
- [x] CPU, RAM, Disk, Network, Temperature monitoring
- [x] Process list with simulated data
- [x] Kill process functionality (simulated)
- [x] AI Recommendations using GPT-5.2
- [x] Task Scheduler with 3 default tasks
- [x] Task enable/disable and run functionality
- [x] Performance Tips (6 tips)
- [x] Tab navigation (Overview, Processes, Scheduler)
- [x] Dark theme with Control Room aesthetic

## Technical Notes
- System metrics are **simulated** (web app can't access real hardware)
- AI uses EMERGENT_LLM_KEY for GPT-5.2 calls
- Data refreshes every 3 seconds
- Uses sonner for toast notifications

## Prioritized Backlog
### P0 (Critical)
- None (MVP complete)

### P1 (High)
- Real desktop integration (Electron wrapper for actual hardware access)
- Persistent settings storage

### P2 (Medium)
- Export system reports
- Historical data analysis
- Custom alert thresholds
- Dark/Light theme toggle

## Next Tasks
1. Consider Electron wrapper for real system metrics access
2. Add export functionality for system reports
3. Add custom alert configuration
