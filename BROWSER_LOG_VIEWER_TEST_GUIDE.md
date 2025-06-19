## 🧪 Browser Log Viewer Test Instructions

### **SETUP VERIFICATION ✅**
All components are properly configured:
- ✅ BroadcastChannel cross-window communication
- ✅ LOG_ENTRY message handling  
- ✅ Browser log integration in App.tsx
- ✅ Console method overrides
- ✅ Debug system integration

### **🔧 STEP-BY-STEP TESTING:**

#### **Step 1: Open Both Windows**
1. **Main App:** `http://localhost:5173/`
2. **Log Viewer:** `http://localhost:5173/browser-log-viewer.html`

#### **Step 2: Generate Test Logs**
In the **main app console** (F12), run:
```javascript
// Basic console tests
console.log("🧪 Test 1: Basic console.log");
console.info("🧪 Test 2: Console info message");
console.warn("🧪 Test 3: Console warning");
console.error("🧪 Test 4: Console error");

// Test with objects
console.log("🧪 Test 5: Object data", {
  user: "tester",
  timestamp: new Date(),
  data: [1, 2, 3]
});

// Test debug system (if available)
if (typeof debug !== 'undefined') {
  debug.info("🧪 Test 6: Debug system", { debugTest: true }, "TestSource");
}
```

#### **Step 3: Direct BroadcastChannel Test**
In the **main app console**, run:
```javascript
// Direct communication test
const bc = new BroadcastChannel("investra-logs");
bc.postMessage({
  type: "LOG_ENTRY", 
  data: {
    id: "direct-test-" + Date.now(),
    timestamp: new Date().toISOString(),
    level: "info",
    message: "🎯 Direct BroadcastChannel test message",
    source: "DirectTest",
    data: { testType: "direct", success: true }
  }
});
```

#### **Step 4: Verify in Log Viewer**
Check the **browser log viewer** for:
- ✅ Status shows "Connected" or "Capturing"
- ✅ All test messages appear in the log list
- ✅ Messages have correct timestamps, levels, and sources
- ✅ Object data is properly formatted
- ✅ Log counter updates (Total/Errors/Warnings)

#### **Step 5: Test Filtering**
In the log viewer:
- ✅ Filter by "Errors Only" - should show only error messages
- ✅ Filter by source "TestSource" - should show only debug messages
- ✅ Filter by "All Levels" - should show all messages

#### **Step 6: Test Export**
- ✅ Click "💾 Export" button
- ✅ JSON file should download with all log data
- ✅ Verify exported data contains timestamps, levels, messages

### **🔍 TROUBLESHOOTING:**

#### **If Status Shows "Disconnected":**
```javascript
// Check if BroadcastChannel works
const bc = new BroadcastChannel("investra-logs");
bc.postMessage({type: "LOG_VIEWER_CONNECT"});
```

#### **If No Logs Appear:**
1. Check browser console for errors
2. Verify both windows are from same origin (localhost:5173)
3. Try refreshing both windows
4. Check if BroadcastChannel is supported:
   ```javascript
   console.log("BroadcastChannel supported:", typeof BroadcastChannel !== 'undefined');
   ```

#### **Manual Connection Test:**
```javascript
// In main app console
window.postMessage({
  type: "LOG_ENTRY",
  data: {
    id: "manual-test",
    timestamp: new Date().toISOString(),
    level: "info", 
    message: "Manual postMessage test",
    source: "Manual"
  }
}, window.location.origin);
```

### **🎯 SUCCESS CRITERIA:**
- ✅ Log viewer shows "Connected" status
- ✅ Console logs from main app appear in viewer
- ✅ Debug system logs appear in viewer  
- ✅ Filtering works correctly
- ✅ Export functionality works
- ✅ Real-time log updates

### **📝 COMMON ISSUES & SOLUTIONS:**

| Issue | Solution |
|-------|----------|
| "Disconnected" status | Check BroadcastChannel support, refresh windows |
| No logs appearing | Verify same origin, check console for errors |
| Only local logs | Browser log integration not initialized |
| Export not working | Check if logs array is populated |
| Filtering broken | Verify log objects have correct structure |

---

**🎉 If all tests pass, the Browser Log Viewer is fully functional!**
