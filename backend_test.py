import requests
import sys
import json
from datetime import datetime

class PCEfficiencyAPITester:
    def __init__(self, base_url="https://perf-monitor-20.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, timeout=30):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=timeout)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=timeout)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=timeout)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                self.failed_tests.append({
                    "test": name,
                    "endpoint": endpoint,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "error": response.text[:200]
                })
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                "test": name,
                "endpoint": endpoint,
                "error": str(e)
            })
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root API", "GET", "", 200)

    def test_system_metrics(self):
        """Test system metrics endpoint"""
        success, data = self.run_test("System Metrics", "GET", "system/metrics", 200)
        if success and data:
            # Validate required fields
            required_fields = ['cpu_usage', 'ram_usage', 'ram_total', 'ram_used', 
                             'disk_usage', 'disk_total', 'disk_used', 'network_up', 
                             'network_down', 'temperature', 'timestamp']
            missing_fields = [field for field in required_fields if field not in data]
            if missing_fields:
                print(f"⚠️  Missing fields: {missing_fields}")
                return False
            print(f"   CPU: {data['cpu_usage']}%, RAM: {data['ram_usage']}%, Temp: {data['temperature']}°C")
        return success

    def test_metrics_history(self):
        """Test metrics history endpoint"""
        success, data = self.run_test("Metrics History", "GET", "system/metrics/history", 200)
        if success and data:
            required_keys = ['cpu', 'ram', 'disk', 'network']
            missing_keys = [key for key in required_keys if key not in data]
            if missing_keys:
                print(f"⚠️  Missing history keys: {missing_keys}")
                return False
        return success

    def test_health_score(self):
        """Test health score endpoint"""
        success, data = self.run_test("Health Score", "GET", "system/health-score", 200)
        if success and data:
            required_fields = ['score', 'status', 'breakdown']
            missing_fields = [field for field in required_fields if field not in data]
            if missing_fields:
                print(f"⚠️  Missing fields: {missing_fields}")
                return False
            print(f"   Health Score: {data['score']}% - {data['status']}")
        return success

    def test_processes(self):
        """Test processes endpoint"""
        success, data = self.run_test("System Processes", "GET", "system/processes", 200)
        if success and data and isinstance(data, list) and len(data) > 0:
            process = data[0]
            required_fields = ['pid', 'name', 'cpu_percent', 'memory_percent', 'memory_mb', 'status']
            missing_fields = [field for field in required_fields if field not in process]
            if missing_fields:
                print(f"⚠️  Missing process fields: {missing_fields}")
                return False
            print(f"   Found {len(data)} processes")
            return True, data
        return success, []

    def test_kill_process(self):
        """Test kill process endpoint"""
        # Use a fake PID for testing
        test_pid = 9999
        return self.run_test("Kill Process", "POST", f"processes/kill?pid={test_pid}", 200)

    def test_ai_recommendations(self):
        """Test AI recommendations endpoint"""
        # First get current metrics and processes
        metrics_success, metrics_data = self.run_test("Get Metrics for AI", "GET", "system/metrics", 200)
        processes_success, processes_data = self.run_test("Get Processes for AI", "GET", "system/processes", 200)
        
        if not metrics_success or not processes_success:
            print("❌ Cannot test AI recommendations - missing metrics or processes data")
            return False
        
        ai_request = {
            "metrics": metrics_data,
            "processes": processes_data[:5] if processes_data else []
        }
        
        success, data = self.run_test("AI Recommendations", "POST", "ai/recommendations", 200, ai_request, timeout=60)
        if success and data and isinstance(data, list):
            print(f"   Received {len(data)} AI recommendations")
            if len(data) > 0:
                rec = data[0]
                required_fields = ['recommendation', 'category', 'priority']
                missing_fields = [field for field in required_fields if field not in rec]
                if missing_fields:
                    print(f"⚠️  Missing recommendation fields: {missing_fields}")
                    return False
        return success

    def test_scheduled_tasks(self):
        """Test scheduled tasks endpoints"""
        # Get tasks
        success, tasks_data = self.run_test("Get Scheduled Tasks", "GET", "scheduler/tasks", 200)
        if not success:
            return False
        
        if tasks_data and isinstance(tasks_data, list) and len(tasks_data) > 0:
            task = tasks_data[0]
            required_fields = ['id', 'name', 'description', 'task_type', 'schedule', 'enabled']
            missing_fields = [field for field in required_fields if field not in task]
            if missing_fields:
                print(f"⚠️  Missing task fields: {missing_fields}")
                return False
            
            task_id = task['id']
            print(f"   Found {len(tasks_data)} scheduled tasks")
            
            # Test toggle task
            toggle_success = self.run_test("Toggle Task", "PUT", f"scheduler/tasks/{task_id}?enabled=true", 200)
            
            # Test run task
            run_success = self.run_test("Run Task", "POST", f"scheduler/tasks/{task_id}/run", 200)
            
            return toggle_success and run_success
        
        return success

    def test_performance_tips(self):
        """Test performance tips endpoint"""
        success, data = self.run_test("Performance Tips", "GET", "tips", 200)
        if success and data and isinstance(data, list) and len(data) > 0:
            tip = data[0]
            required_fields = ['id', 'title', 'description', 'category']
            missing_fields = [field for field in required_fields if field not in tip]
            if missing_fields:
                print(f"⚠️  Missing tip fields: {missing_fields}")
                return False
            print(f"   Found {len(data)} performance tips")
        return success

def main():
    print("🚀 Starting PC Efficiency Manager API Tests")
    print("=" * 60)
    
    tester = PCEfficiencyAPITester()
    
    # Run all tests
    test_results = []
    
    print("\n📡 Testing Basic Endpoints...")
    test_results.append(("Root API", tester.test_root_endpoint()))
    
    print("\n📊 Testing System Monitoring...")
    test_results.append(("System Metrics", tester.test_system_metrics()))
    test_results.append(("Metrics History", tester.test_metrics_history()))
    test_results.append(("Health Score", tester.test_health_score()))
    
    print("\n🔧 Testing Process Management...")
    test_results.append(("System Processes", tester.test_processes()))
    test_results.append(("Kill Process", tester.test_kill_process()))
    
    print("\n🤖 Testing AI Features...")
    test_results.append(("AI Recommendations", tester.test_ai_recommendations()))
    
    print("\n⏰ Testing Task Scheduler...")
    test_results.append(("Scheduled Tasks", tester.test_scheduled_tasks()))
    
    print("\n💡 Testing Performance Tips...")
    test_results.append(("Performance Tips", tester.test_performance_tips()))
    
    # Print summary
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    
    for test_name, result in test_results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
    
    print(f"\n📈 Overall: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.failed_tests:
        print("\n❌ FAILED TESTS:")
        for failure in tester.failed_tests:
            print(f"   • {failure['test']}: {failure.get('error', 'Status code mismatch')}")
    
    success_rate = (tester.tests_passed / tester.tests_run) * 100 if tester.tests_run > 0 else 0
    print(f"📊 Success Rate: {success_rate:.1f}%")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())