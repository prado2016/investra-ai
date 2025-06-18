"use strict";
/**
 * Email Processing Service Monitoring
 * Task 11.3: Implement Service Monitoring
 * Provides health checks, auto-restart, and monitoring capabilities
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceMonitor = void 0;
const events_1 = require("events");
const promises_1 = __importDefault(require("fs/promises"));
class ServiceMonitor extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.restartCount = 0;
        this.isShuttingDown = false;
        this.config = config;
        this.metrics = this.initializeMetrics();
        if (this.config.enabled) {
            this.startMonitoring();
        }
    }
    /**
     * Initialize metrics
     */
    initializeMetrics() {
        return {
            status: 'unknown',
            uptime: 0,
            startTime: new Date(),
            lastHealthCheck: new Date(),
            memoryUsage: process.memoryUsage(),
            cpuUsage: process.cpuUsage(),
            errorCount: 0,
            successCount: 0,
            totalRequests: 0
        };
    }
    /**
     * Start monitoring
     */
    startMonitoring() {
        if (!this.config.enabled)
            return;
        console.log('📊 Starting service monitoring...');
        // Initial health check
        this.performHealthCheck();
        // Schedule regular health checks
        this.healthCheckTimer = setInterval(() => {
            this.performHealthCheck();
        }, this.config.healthCheckInterval);
        // Track process events
        this.setupProcessEventHandlers();
        console.log(`✅ Service monitoring started (interval: ${this.config.healthCheckInterval}ms)`);
    }
    /**
     * Stop monitoring
     */
    stopMonitoring() {
        console.log('🛑 Stopping service monitoring...');
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
            this.healthCheckTimer = undefined;
        }
        this.isShuttingDown = true;
        console.log('✅ Service monitoring stopped');
    }
    /**
     * Perform comprehensive health check
     */
    async performHealthCheck() {
        const startTime = Date.now();
        try {
            // Update uptime
            this.metrics.uptime = Date.now() - this.metrics.startTime.getTime();
            this.metrics.lastHealthCheck = new Date();
            // Memory check
            const memoryUsage = process.memoryUsage();
            this.metrics.memoryUsage = memoryUsage;
            const memoryUsedMB = memoryUsage.heapUsed / 1024 / 1024;
            const memoryHealthy = memoryUsedMB < this.config.memoryThreshold;
            // CPU check
            const cpuUsage = process.cpuUsage(this.lastCpuUsage);
            this.metrics.cpuUsage = cpuUsage;
            this.lastCpuUsage = process.cpuUsage();
            // Convert to percentage (simplified)
            const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000 / this.config.healthCheckInterval * 100;
            const cpuHealthy = cpuPercent < this.config.cpuThreshold;
            // Disk check
            const diskHealthy = await this.checkDiskSpace();
            // Error rate check
            const errorRate = this.metrics.totalRequests > 0
                ? (this.metrics.errorCount / this.metrics.totalRequests) * 100
                : 0;
            const errorHealthy = errorRate < this.config.errorThreshold;
            // Overall health determination
            const checks = {
                service: true, // Service is running if we're checking
                memory: memoryHealthy,
                cpu: cpuHealthy,
                disk: diskHealthy
            };
            const allChecksHealthy = Object.values(checks).every(check => check);
            const overallHealthy = allChecksHealthy && errorHealthy;
            // Update status
            this.metrics.status = overallHealthy ? 'healthy' :
                (memoryHealthy && cpuHealthy) ? 'degraded' : 'unhealthy';
            const result = {
                healthy: overallHealthy,
                status: this.metrics.status,
                timestamp: new Date(),
                checks,
                metrics: { ...this.metrics },
                details: {
                    memoryUsedMB: Math.round(memoryUsedMB),
                    cpuPercent: Math.round(cpuPercent),
                    errorRate: Math.round(errorRate),
                    checkDuration: Date.now() - startTime
                }
            };
            // Emit health check event
            this.emit('healthCheck', result);
            // Handle unhealthy state
            if (!overallHealthy) {
                this.handleUnhealthyState(result);
            }
            // Log health check if configured
            if (this.config.logPath) {
                await this.logHealthCheck(result);
            }
            return result;
        }
        catch (error) {
            console.error('❌ Health check failed:', error);
            this.recordError('Health check failed', error);
            return {
                healthy: false,
                status: 'unhealthy',
                timestamp: new Date(),
                checks: {
                    service: false,
                    memory: false,
                    cpu: false,
                    disk: false
                },
                metrics: { ...this.metrics },
                details: { error: error instanceof Error ? error.message : 'Unknown error' }
            };
        }
    }
    /**
     * Check disk space
     */
    async checkDiskSpace() {
        try {
            const stats = await promises_1.default.statfs(process.cwd());
            const totalSpace = stats.bavail * stats.bsize;
            const freeSpace = stats.bavail * stats.bsize;
            const usedPercent = ((totalSpace - freeSpace) / totalSpace) * 100;
            return usedPercent < this.config.diskThreshold;
        }
        catch (error) {
            console.warn('⚠️ Could not check disk space:', error);
            return true; // Assume healthy if we can't check
        }
    }
    /**
     * Handle unhealthy service state
     */
    async handleUnhealthyState(healthCheck) {
        console.warn('⚠️ Service is unhealthy:', healthCheck.status);
        this.emit('unhealthy', healthCheck);
        // Auto-restart if enabled and not shutting down
        if (this.config.autoRestart && !this.isShuttingDown) {
            if (this.restartCount < this.config.maxRestarts) {
                console.log(`🔄 Attempting auto-restart (${this.restartCount + 1}/${this.config.maxRestarts})...`);
                setTimeout(() => {
                    this.attemptRestart();
                }, this.config.restartDelay);
            }
            else {
                console.error('❌ Max restart attempts reached. Manual intervention required.');
                this.emit('maxRestartsReached', healthCheck);
            }
        }
        // Send alert if webhook configured
        if (this.config.alertWebhook) {
            await this.sendAlert(healthCheck);
        }
    }
    /**
     * Attempt service restart
     */
    attemptRestart() {
        this.restartCount++;
        try {
            console.log('🔄 Restarting service...');
            // Reset metrics
            this.metrics = this.initializeMetrics();
            // Emit restart event
            this.emit('restart', this.restartCount);
            console.log('✅ Service restart completed');
        }
        catch (error) {
            console.error('❌ Service restart failed:', error);
            this.recordError('Service restart failed', error);
        }
    }
    /**
     * Record success metric
     */
    recordSuccess() {
        this.metrics.successCount++;
        this.metrics.totalRequests++;
    }
    /**
     * Record error metric
     */
    recordError(message, error) {
        this.metrics.errorCount++;
        this.metrics.totalRequests++;
        this.metrics.lastError = message;
        this.metrics.lastErrorTime = new Date();
        console.error(`❌ Error recorded: ${message}`, error);
        this.emit('error', { message, error, timestamp: new Date() });
    }
    /**
     * Get current metrics
     */
    getMetrics() {
        return { ...this.metrics };
    }
    /**
     * Reset metrics
     */
    resetMetrics() {
        this.metrics = this.initializeMetrics();
        this.restartCount = 0;
    }
    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        if (this.config.enabled && !this.healthCheckTimer) {
            this.startMonitoring();
        }
        else if (!this.config.enabled && this.healthCheckTimer) {
            this.stopMonitoring();
        }
    }
    /**
     * Setup process event handlers
     */
    setupProcessEventHandlers() {
        process.on('uncaughtException', (error) => {
            this.recordError('Uncaught exception', error);
        });
        process.on('unhandledRejection', (reason, promise) => {
            this.recordError('Unhandled rejection', { reason, promise });
        });
        process.on('SIGTERM', () => {
            console.log('📊 Received SIGTERM, stopping monitoring...');
            this.stopMonitoring();
        });
        process.on('SIGINT', () => {
            console.log('📊 Received SIGINT, stopping monitoring...');
            this.stopMonitoring();
        });
    }
    /**
     * Log health check to file
     */
    async logHealthCheck(result) {
        if (!this.config.logPath)
            return;
        try {
            const logEntry = {
                timestamp: result.timestamp.toISOString(),
                healthy: result.healthy,
                status: result.status,
                metrics: result.metrics,
                details: result.details
            };
            const logLine = JSON.stringify(logEntry) + '\n';
            await promises_1.default.appendFile(this.config.logPath, logLine);
        }
        catch (error) {
            console.error('❌ Failed to write health check log:', error);
        }
    }
    /**
     * Send alert via webhook
     */
    async sendAlert(healthCheck) {
        if (!this.config.alertWebhook)
            return;
        try {
            const fetch = (await Promise.resolve().then(() => __importStar(require('node-fetch')))).default;
            const alertData = {
                service: 'Investra Email Processing API',
                status: healthCheck.status,
                timestamp: healthCheck.timestamp.toISOString(),
                metrics: healthCheck.metrics,
                details: healthCheck.details
            };
            await fetch(this.config.alertWebhook, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(alertData)
            });
            console.log('📢 Alert sent successfully');
        }
        catch (error) {
            console.error('❌ Failed to send alert:', error);
        }
    }
    /**
     * Create default monitoring configuration
     */
    static createDefaultConfig() {
        return {
            enabled: true,
            healthCheckInterval: 30000, // 30 seconds
            memoryThreshold: 512, // 512 MB
            cpuThreshold: 80, // 80%
            diskThreshold: 90, // 90%
            errorThreshold: 10, // 10%
            autoRestart: true,
            maxRestarts: 3,
            restartDelay: 5000, // 5 seconds
            logPath: '/var/log/investra/health.log'
        };
    }
    /**
     * Create configuration from environment variables
     */
    static createConfigFromEnv() {
        return {
            enabled: process.env.MONITORING_ENABLED !== 'false',
            healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'),
            memoryThreshold: parseInt(process.env.MEMORY_THRESHOLD || '512'),
            cpuThreshold: parseInt(process.env.CPU_THRESHOLD || '80'),
            diskThreshold: parseInt(process.env.DISK_THRESHOLD || '90'),
            errorThreshold: parseInt(process.env.ERROR_THRESHOLD || '10'),
            autoRestart: process.env.AUTO_RESTART !== 'false',
            maxRestarts: parseInt(process.env.MAX_RESTARTS || '3'),
            restartDelay: parseInt(process.env.RESTART_DELAY || '5000'),
            logPath: process.env.HEALTH_LOG_PATH,
            alertWebhook: process.env.ALERT_WEBHOOK
        };
    }
}
exports.ServiceMonitor = ServiceMonitor;
