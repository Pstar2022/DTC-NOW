from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import random
import asyncio
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ===================== MODELS =====================

class SystemMetrics(BaseModel):
    model_config = ConfigDict(extra="ignore")
    cpu_usage: float
    ram_usage: float
    ram_total: float
    ram_used: float
    disk_usage: float
    disk_total: float
    disk_used: float
    network_up: float
    network_down: float
    temperature: float
    timestamp: str

class Process(BaseModel):
    model_config = ConfigDict(extra="ignore")
    pid: int
    name: str
    cpu_percent: float
    memory_percent: float
    memory_mb: float
    status: str

class ScheduledTask(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    task_type: str
    schedule: str
    enabled: bool = True
    last_run: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ScheduledTaskCreate(BaseModel):
    name: str
    description: str
    task_type: str
    schedule: str
    enabled: bool = True

class AIRecommendationRequest(BaseModel):
    metrics: dict
    processes: List[dict]

class AIRecommendation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    recommendation: str
    category: str
    priority: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class HealthScore(BaseModel):
    score: int
    status: str
    breakdown: dict

class MetricsHistory(BaseModel):
    cpu: List[dict]
    ram: List[dict]
    disk: List[dict]
    network: List[dict]

# ===================== SIMULATED DATA GENERATORS =====================

def generate_simulated_metrics():
    """Generate realistic simulated system metrics"""
    cpu = random.uniform(15, 85)
    ram_total = 16.0
    ram_used = random.uniform(4, 12)
    disk_total = 512.0
    disk_used = random.uniform(150, 400)
    
    return SystemMetrics(
        cpu_usage=round(cpu, 1),
        ram_usage=round((ram_used / ram_total) * 100, 1),
        ram_total=ram_total,
        ram_used=round(ram_used, 2),
        disk_usage=round((disk_used / disk_total) * 100, 1),
        disk_total=disk_total,
        disk_used=round(disk_used, 2),
        network_up=round(random.uniform(0.5, 50), 2),
        network_down=round(random.uniform(1, 150), 2),
        temperature=round(random.uniform(45, 85), 1),
        timestamp=datetime.now(timezone.utc).isoformat()
    )

def generate_simulated_processes():
    """Generate realistic simulated processes"""
    process_templates = [
        {"name": "chrome.exe", "cpu_range": (5, 25), "mem_range": (500, 2500)},
        {"name": "firefox.exe", "cpu_range": (3, 20), "mem_range": (400, 2000)},
        {"name": "code.exe", "cpu_range": (2, 15), "mem_range": (300, 1500)},
        {"name": "node.exe", "cpu_range": (1, 10), "mem_range": (100, 800)},
        {"name": "python.exe", "cpu_range": (1, 20), "mem_range": (50, 500)},
        {"name": "explorer.exe", "cpu_range": (0, 3), "mem_range": (50, 200)},
        {"name": "spotify.exe", "cpu_range": (1, 8), "mem_range": (150, 500)},
        {"name": "discord.exe", "cpu_range": (1, 5), "mem_range": (200, 600)},
        {"name": "slack.exe", "cpu_range": (1, 4), "mem_range": (150, 400)},
        {"name": "teams.exe", "cpu_range": (2, 10), "mem_range": (300, 800)},
        {"name": "antivirus.exe", "cpu_range": (0, 5), "mem_range": (80, 200)},
        {"name": "system", "cpu_range": (0, 2), "mem_range": (20, 100)},
        {"name": "dwm.exe", "cpu_range": (1, 5), "mem_range": (100, 300)},
        {"name": "gameoverlay.exe", "cpu_range": (0, 2), "mem_range": (50, 150)},
        {"name": "docker.exe", "cpu_range": (2, 15), "mem_range": (200, 1000)},
    ]
    
    processes = []
    for i, template in enumerate(process_templates):
        cpu = random.uniform(*template["cpu_range"])
        mem_mb = random.uniform(*template["mem_range"])
        processes.append(Process(
            pid=1000 + i * 100 + random.randint(0, 50),
            name=template["name"],
            cpu_percent=round(cpu, 1),
            memory_percent=round(mem_mb / 160, 1),
            memory_mb=round(mem_mb, 1),
            status=random.choice(["Running", "Running", "Running", "Sleeping"])
        ))
    
    return sorted(processes, key=lambda x: x.cpu_percent, reverse=True)

def calculate_health_score(metrics: SystemMetrics):
    """Calculate overall system health score"""
    cpu_score = max(0, 100 - metrics.cpu_usage)
    ram_score = max(0, 100 - metrics.ram_usage)
    disk_score = max(0, 100 - metrics.disk_usage)
    temp_score = max(0, 100 - (metrics.temperature - 40))
    
    overall = int((cpu_score * 0.35 + ram_score * 0.3 + disk_score * 0.2 + temp_score * 0.15))
    
    if overall >= 80:
        status = "Excellent"
    elif overall >= 60:
        status = "Good"
    elif overall >= 40:
        status = "Fair"
    else:
        status = "Poor"
    
    return HealthScore(
        score=overall,
        status=status,
        breakdown={
            "cpu": int(cpu_score),
            "ram": int(ram_score),
            "disk": int(disk_score),
            "temperature": int(temp_score)
        }
    )

# Store metrics history in memory for charts
metrics_history = {
    "cpu": [],
    "ram": [],
    "disk": [],
    "network": []
}

# ===================== ROUTES =====================

@api_router.get("/")
async def root():
    return {"message": "PC Efficiency Manager API"}

@api_router.get("/system/metrics", response_model=SystemMetrics)
async def get_system_metrics():
    """Get current system metrics (simulated)"""
    metrics = generate_simulated_metrics()
    
    # Update history (keep last 30 data points)
    timestamp = datetime.now(timezone.utc).strftime("%H:%M:%S")
    
    metrics_history["cpu"].append({"time": timestamp, "value": metrics.cpu_usage})
    metrics_history["ram"].append({"time": timestamp, "value": metrics.ram_usage})
    metrics_history["disk"].append({"time": timestamp, "value": metrics.disk_usage})
    metrics_history["network"].append({"time": timestamp, "up": metrics.network_up, "down": metrics.network_down})
    
    for key in metrics_history:
        if len(metrics_history[key]) > 30:
            metrics_history[key] = metrics_history[key][-30:]
    
    return metrics

@api_router.get("/system/metrics/history", response_model=MetricsHistory)
async def get_metrics_history():
    """Get historical metrics for charts"""
    return MetricsHistory(**metrics_history)

@api_router.get("/system/health-score", response_model=HealthScore)
async def get_health_score():
    """Get overall system health score"""
    metrics = generate_simulated_metrics()
    return calculate_health_score(metrics)

@api_router.get("/system/processes", response_model=List[Process])
async def get_processes():
    """Get list of running processes (simulated)"""
    return generate_simulated_processes()

@api_router.post("/processes/kill")
async def kill_process(pid: int):
    """Kill a process by PID (simulated)"""
    # Simulated - in a real app this would kill the process
    return {"success": True, "message": f"Process {pid} terminated successfully"}

@api_router.post("/ai/recommendations", response_model=List[AIRecommendation])
async def get_ai_recommendations(request: AIRecommendationRequest):
    """Get AI-powered optimization recommendations using GPT-5.2"""
    try:
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="AI service not configured")
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"pc-optimizer-{uuid.uuid4()}",
            system_message="""You are an expert PC optimization assistant. Analyze system metrics and processes to provide actionable recommendations for improving PC performance.

Always respond with exactly 3-4 specific, actionable recommendations in this JSON format:
[
  {"recommendation": "specific action to take", "category": "CPU|RAM|Disk|Network|General", "priority": "high|medium|low"},
  ...
]

Focus on practical tips like:
- Identifying resource-heavy processes
- Memory optimization suggestions
- Disk cleanup recommendations
- Startup optimization
- Background process management
- Temperature management

Keep recommendations concise and actionable. Do not include explanations outside the JSON."""
        ).with_model("openai", "gpt-5.2")
        
        metrics_summary = f"""
Current System Status:
- CPU Usage: {request.metrics.get('cpu_usage', 'N/A')}%
- RAM Usage: {request.metrics.get('ram_usage', 'N/A')}% ({request.metrics.get('ram_used', 'N/A')} GB / {request.metrics.get('ram_total', 'N/A')} GB)
- Disk Usage: {request.metrics.get('disk_usage', 'N/A')}%
- Temperature: {request.metrics.get('temperature', 'N/A')}°C

Top Processes by CPU:
"""
        for proc in request.processes[:5]:
            metrics_summary += f"- {proc.get('name', 'Unknown')}: CPU {proc.get('cpu_percent', 0)}%, Memory {proc.get('memory_mb', 0)} MB\n"
        
        user_message = UserMessage(text=f"Analyze this system data and provide optimization recommendations:\n{metrics_summary}")
        response = await chat.send_message(user_message)
        
        import json
        try:
            # Try to parse the response as JSON
            recommendations_data = json.loads(response)
            recommendations = []
            for rec in recommendations_data:
                recommendations.append(AIRecommendation(
                    recommendation=rec.get("recommendation", ""),
                    category=rec.get("category", "General"),
                    priority=rec.get("priority", "medium")
                ))
            return recommendations
        except json.JSONDecodeError:
            # If not valid JSON, create a single recommendation from the text
            return [AIRecommendation(
                recommendation=response[:500],
                category="General",
                priority="medium"
            )]
            
    except Exception as e:
        logger.error(f"AI recommendation error: {str(e)}")
        # Return fallback recommendations
        return [
            AIRecommendation(
                recommendation="Close unused browser tabs to free up memory",
                category="RAM",
                priority="medium"
            ),
            AIRecommendation(
                recommendation="Run disk cleanup to free up storage space",
                category="Disk",
                priority="low"
            ),
            AIRecommendation(
                recommendation="Check startup programs and disable unnecessary ones",
                category="General",
                priority="high"
            )
        ]

@api_router.get("/scheduler/tasks", response_model=List[ScheduledTask])
async def get_scheduled_tasks():
    """Get all scheduled maintenance tasks"""
    tasks = await db.scheduled_tasks.find({}, {"_id": 0}).to_list(100)
    if not tasks:
        # Return default tasks if none exist
        default_tasks = [
            {
                "id": str(uuid.uuid4()),
                "name": "Disk Cleanup",
                "description": "Remove temporary files and clear system cache",
                "task_type": "cleanup",
                "schedule": "Weekly",
                "enabled": True,
                "last_run": None,
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Memory Optimization",
                "description": "Clear RAM cache and optimize memory allocation",
                "task_type": "memory",
                "schedule": "Daily",
                "enabled": True,
                "last_run": None,
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Startup Cleanup",
                "description": "Review and optimize startup programs",
                "task_type": "startup",
                "schedule": "Monthly",
                "enabled": False,
                "last_run": None,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        ]
        for task in default_tasks:
            await db.scheduled_tasks.insert_one(task)
        return default_tasks
    return tasks

@api_router.post("/scheduler/tasks", response_model=ScheduledTask)
async def create_scheduled_task(task: ScheduledTaskCreate):
    """Create a new scheduled task"""
    task_dict = task.model_dump()
    task_obj = ScheduledTask(**task_dict)
    doc = task_obj.model_dump()
    await db.scheduled_tasks.insert_one(doc)
    return task_obj

@api_router.put("/scheduler/tasks/{task_id}")
async def update_scheduled_task(task_id: str, enabled: bool):
    """Enable or disable a scheduled task"""
    result = await db.scheduled_tasks.update_one(
        {"id": task_id},
        {"$set": {"enabled": enabled}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"success": True, "message": f"Task {'enabled' if enabled else 'disabled'}"}

@api_router.post("/scheduler/tasks/{task_id}/run")
async def run_scheduled_task(task_id: str):
    """Run a scheduled task immediately"""
    task = await db.scheduled_tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Simulate task execution
    await asyncio.sleep(1)
    
    await db.scheduled_tasks.update_one(
        {"id": task_id},
        {"$set": {"last_run": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "message": f"Task '{task['name']}' completed successfully"}

@api_router.get("/tips")
async def get_performance_tips():
    """Get static performance tips"""
    return [
        {
            "id": 1,
            "title": "Manage Startup Programs",
            "description": "Disable unnecessary startup programs to speed up boot time",
            "category": "startup"
        },
        {
            "id": 2,
            "title": "Regular Disk Cleanup",
            "description": "Remove temporary files and empty recycle bin weekly",
            "category": "disk"
        },
        {
            "id": 3,
            "title": "Browser Tab Management",
            "description": "Limit open tabs to reduce memory usage significantly",
            "category": "memory"
        },
        {
            "id": 4,
            "title": "Update Drivers",
            "description": "Keep graphics and system drivers updated for best performance",
            "category": "general"
        },
        {
            "id": 5,
            "title": "Monitor Temperature",
            "description": "Clean dust from fans and ensure proper ventilation",
            "category": "temperature"
        },
        {
            "id": 6,
            "title": "SSD Optimization",
            "description": "Enable TRIM and avoid defragmentation on SSDs",
            "category": "disk"
        }
    ]

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
