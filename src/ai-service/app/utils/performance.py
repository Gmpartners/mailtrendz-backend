"""
✅ PERFORMANCE MONITOR - MONITORAMENTO DE PERFORMANCE
Sistema de monitoramento e métricas para o serviço de IA
"""

import time
import psutil
import threading
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from collections import deque, defaultdict
from loguru import logger

class PerformanceMonitor:
    """Monitor de performance para o serviço de IA"""
    
    def __init__(self):
        self.start_time = datetime.now()
        self.request_history = deque(maxlen=1000)  # Últimas 1000 requests
        self.error_history = deque(maxlen=100)     # Últimos 100 erros
        self.metrics = defaultdict(list)
        self.active_requests = 0
        self.total_requests = 0
        self.total_errors = 0
        
        # Métricas de sistema
        self.system_metrics = {
            "cpu_usage": deque(maxlen=60),      # Último minuto
            "memory_usage": deque(maxlen=60),   # Último minuto
            "disk_usage": deque(maxlen=60),     # Último minuto
        }
        
        # Threading para coleta de métricas
        self._monitoring_active = True
        self._monitor_thread = threading.Thread(target=self._collect_system_metrics, daemon=True)
        self._monitor_thread.start()
        
        logger.info("🚀 Performance Monitor iniciado")
    
    def get_uptime(self) -> str:
        """Retorna tempo de atividade formatado"""
        uptime = datetime.now() - self.start_time
        
        days = uptime.days
        hours, remainder = divmod(uptime.seconds, 3600)
        minutes, seconds = divmod(remainder, 60)
        
        if days > 0:
            return f"{days}d {hours}h {minutes}m"
        elif hours > 0:
            return f"{hours}h {minutes}m {seconds}s"
        else:
            return f"{minutes}m {seconds}s"
    
    def start_request(self, request_type: str, details: Optional[Dict] = None) -> str:
        """Inicia monitoramento de uma request"""
        
        request_id = f"{request_type}_{int(time.time() * 1000)}"
        
        request_data = {
            "id": request_id,
            "type": request_type,
            "start_time": datetime.now(),
            "details": details or {},
            "status": "processing"
        }
        
        self.request_history.append(request_data)
        self.active_requests += 1
        self.total_requests += 1
        
        return request_id
    
    def finish_request(
        self,
        request_id: str,
        success: bool = True,
        error_message: Optional[str] = None,
        metrics: Optional[Dict] = None
    ):
        """Finaliza monitoramento de uma request"""
        
        # Encontrar request no histórico
        for request in reversed(self.request_history):
            if request["id"] == request_id:
                request["end_time"] = datetime.now()
                request["duration"] = (request["end_time"] - request["start_time"]).total_seconds()
                request["success"] = success
                request["status"] = "completed" if success else "failed"
                
                if error_message:
                    request["error"] = error_message
                
                if metrics:
                    request["metrics"] = metrics
                
                break
        
        self.active_requests = max(0, self.active_requests - 1)
        
        if not success:
            self.total_errors += 1
            self.error_history.append({
                "request_id": request_id,
                "timestamp": datetime.now(),
                "error": error_message,
                "type": "request_error"
            })
    
    def record_metric(self, metric_name: str, value: float, tags: Optional[Dict] = None):
        """Registra uma métrica customizada"""
        
        metric_data = {
            "timestamp": datetime.now(),
            "value": value,
            "tags": tags or {}
        }
        
        self.metrics[metric_name].append(metric_data)
        
        # Manter apenas últimas 100 métricas por tipo
        if len(self.metrics[metric_name]) > 100:
            self.metrics[metric_name] = self.metrics[metric_name][-100:]
    
    def get_performance_summary(self) -> Dict[str, Any]:
        """Retorna resumo de performance"""
        
        now = datetime.now()
        
        # Estatísticas de requests
        recent_requests = [
            r for r in self.request_history 
            if (now - r["start_time"]).total_seconds() < 3600  # Última hora
        ]
        
        successful_requests = [r for r in recent_requests if r.get("success", True)]
        failed_requests = [r for r in recent_requests if not r.get("success", True)]
        
        # Calcular médias de tempo de resposta
        completed_requests = [r for r in recent_requests if "duration" in r]
        avg_response_time = (
            sum(r["duration"] for r in completed_requests) / len(completed_requests)
            if completed_requests else 0
        )
        
        # Estatísticas de sistema
        system_stats = self._get_current_system_stats()
        
        # Requests por tipo
        request_types = defaultdict(int)
        for request in recent_requests:
            request_types[request["type"]] += 1
        
        return {
            "uptime": self.get_uptime(),
            "timestamp": now,
            "requests": {
                "active": self.active_requests,
                "total": self.total_requests,
                "total_errors": self.total_errors,
                "last_hour": len(recent_requests),
                "successful_last_hour": len(successful_requests),
                "failed_last_hour": len(failed_requests),
                "success_rate": (
                    len(successful_requests) / len(recent_requests) * 100
                    if recent_requests else 100
                ),
                "avg_response_time": round(avg_response_time, 3),
                "by_type": dict(request_types)
            },
            "system": system_stats,
            "errors": {
                "total": self.total_errors,
                "recent": len([e for e in self.error_history if (now - e["timestamp"]).total_seconds() < 3600])
            }
        }
    
    def get_detailed_metrics(self) -> Dict[str, Any]:
        """Retorna métricas detalhadas"""
        
        now = datetime.now()
        
        # Métricas de performance por hora
        hourly_metrics = self._calculate_hourly_metrics()
        
        # Top erros
        recent_errors = [
            e for e in self.error_history 
            if (now - e["timestamp"]).total_seconds() < 3600
        ]
        
        error_summary = defaultdict(int)
        for error in recent_errors:
            error_type = error.get("error", "Unknown Error")[:50]
            error_summary[error_type] += 1
        
        # Métricas customizadas
        custom_metrics = {}
        for metric_name, values in self.metrics.items():
            recent_values = [
                v for v in values 
                if (now - v["timestamp"]).total_seconds() < 3600
            ]
            
            if recent_values:
                custom_metrics[metric_name] = {
                    "count": len(recent_values),
                    "avg": sum(v["value"] for v in recent_values) / len(recent_values),
                    "min": min(v["value"] for v in recent_values),
                    "max": max(v["value"] for v in recent_values),
                    "latest": recent_values[-1]["value"]
                }
        
        return {
            "hourly_performance": hourly_metrics,
            "top_errors": dict(error_summary),
            "custom_metrics": custom_metrics,
            "system_trends": self._get_system_trends(),
            "recommendations": self._generate_recommendations()
        }
    
    def get_health_status(self) -> Dict[str, Any]:
        """Retorna status de saúde do sistema"""
        
        now = datetime.now()
        health_score = 100
        issues = []
        warnings = []
        
        # Verificar CPU
        current_cpu = self._get_current_cpu_usage()
        if current_cpu > 90:
            health_score -= 30
            issues.append("CPU usage critical (>90%)")
        elif current_cpu > 75:
            health_score -= 15
            warnings.append("CPU usage high (>75%)")
        
        # Verificar memória
        current_memory = self._get_current_memory_usage()
        if current_memory > 90:
            health_score -= 30
            issues.append("Memory usage critical (>90%)")
        elif current_memory > 80:
            health_score -= 15
            warnings.append("Memory usage high (>80%)")
        
        # Verificar taxa de erro
        recent_requests = [
            r for r in self.request_history 
            if (now - r["start_time"]).total_seconds() < 900  # Últimos 15 min
        ]
        
        if recent_requests:
            error_rate = len([r for r in recent_requests if not r.get("success", True)]) / len(recent_requests)
            if error_rate > 0.1:  # >10% erro
                health_score -= 25
                issues.append(f"High error rate: {error_rate:.1%}")
            elif error_rate > 0.05:  # >5% erro
                health_score -= 10
                warnings.append(f"Elevated error rate: {error_rate:.1%}")
        
        # Verificar tempo de resposta
        completed_requests = [r for r in recent_requests if "duration" in r]
        if completed_requests:
            avg_response = sum(r["duration"] for r in completed_requests) / len(completed_requests)
            if avg_response > 30:  # >30s
                health_score -= 20
                issues.append(f"Slow response time: {avg_response:.1f}s")
            elif avg_response > 15:  # >15s
                health_score -= 10
                warnings.append(f"Elevated response time: {avg_response:.1f}s")
        
        # Verificar requests ativas
        if self.active_requests > 10:
            health_score -= 15
            warnings.append(f"Many active requests: {self.active_requests}")
        
        # Determinar status
        if health_score >= 90:
            status = "excellent"
        elif health_score >= 75:
            status = "good"
        elif health_score >= 50:
            status = "fair"
        elif health_score >= 25:
            status = "poor"
        else:
            status = "critical"
        
        return {
            "status": status,
            "health_score": max(0, health_score),
            "issues": issues,
            "warnings": warnings,
            "system_resources": {
                "cpu_usage": current_cpu,
                "memory_usage": current_memory,
                "active_requests": self.active_requests
            },
            "timestamp": now
        }
    
    def _collect_system_metrics(self):
        """Coleta métricas de sistema em background"""
        
        while self._monitoring_active:
            try:
                # CPU
                cpu_percent = psutil.cpu_percent(interval=1)
                self.system_metrics["cpu_usage"].append({
                    "timestamp": datetime.now(),
                    "value": cpu_percent
                })
                
                # Memória
                memory = psutil.virtual_memory()
                self.system_metrics["memory_usage"].append({
                    "timestamp": datetime.now(),
                    "value": memory.percent
                })
                
                # Disco
                disk = psutil.disk_usage('/')
                disk_percent = (disk.used / disk.total) * 100
                self.system_metrics["disk_usage"].append({
                    "timestamp": datetime.now(),
                    "value": disk_percent
                })
                
                time.sleep(60)  # Coletar a cada minuto
                
            except Exception as e:
                logger.error(f"❌ Erro coletando métricas de sistema: {e}")
                time.sleep(60)
    
    def _get_current_system_stats(self) -> Dict[str, Any]:
        """Retorna estatísticas atuais do sistema"""
        
        try:
            # CPU
            cpu_percent = psutil.cpu_percent()
            
            # Memória
            memory = psutil.virtual_memory()
            
            # Disco
            disk = psutil.disk_usage('/')
            
            # Rede (se disponível)
            try:
                network = psutil.net_io_counters()
                network_stats = {
                    "bytes_sent": network.bytes_sent,
                    "bytes_recv": network.bytes_recv
                }
            except:
                network_stats = {}
            
            return {
                "cpu": {
                    "usage_percent": cpu_percent,
                    "count": psutil.cpu_count()
                },
                "memory": {
                    "usage_percent": memory.percent,
                    "used_gb": round(memory.used / (1024**3), 2),
                    "total_gb": round(memory.total / (1024**3), 2)
                },
                "disk": {
                    "usage_percent": round((disk.used / disk.total) * 100, 1),
                    "used_gb": round(disk.used / (1024**3), 2),
                    "total_gb": round(disk.total / (1024**3), 2)
                },
                "network": network_stats
            }
            
        except Exception as e:
            logger.error(f"❌ Erro obtendo stats do sistema: {e}")
            return {"error": str(e)}
    
    def _get_current_cpu_usage(self) -> float:
        """Retorna uso atual de CPU"""
        try:
            return psutil.cpu_percent()
        except:
            return 0.0
    
    def _get_current_memory_usage(self) -> float:
        """Retorna uso atual de memória"""
        try:
            return psutil.virtual_memory().percent
        except:
            return 0.0
    
    def _calculate_hourly_metrics(self) -> Dict[str, Any]:
        """Calcula métricas por hora"""
        
        now = datetime.now()
        hourly_data = defaultdict(lambda: {"requests": 0, "errors": 0, "total_time": 0})
        
        for request in self.request_history:
            hour_key = request["start_time"].strftime("%Y-%m-%d %H:00")
            hourly_data[hour_key]["requests"] += 1
            
            if not request.get("success", True):
                hourly_data[hour_key]["errors"] += 1
            
            if "duration" in request:
                hourly_data[hour_key]["total_time"] += request["duration"]
        
        # Calcular médias
        for hour_data in hourly_data.values():
            if hour_data["requests"] > 0:
                hour_data["avg_response_time"] = hour_data["total_time"] / hour_data["requests"]
                hour_data["error_rate"] = hour_data["errors"] / hour_data["requests"]
        
        return dict(hourly_data)
    
    def _get_system_trends(self) -> Dict[str, Any]:
        """Retorna tendências do sistema"""
        
        trends = {}
        
        for metric_name, values in self.system_metrics.items():
            if len(values) >= 2:
                recent_avg = sum(v["value"] for v in values[-10:]) / min(10, len(values))
                older_avg = sum(v["value"] for v in values[-20:-10]) / min(10, len(values) - 10) if len(values) > 10 else recent_avg
                
                trend = "stable"
                if recent_avg > older_avg * 1.1:
                    trend = "increasing"
                elif recent_avg < older_avg * 0.9:
                    trend = "decreasing"
                
                trends[metric_name] = {
                    "current": round(recent_avg, 1),
                    "trend": trend,
                    "change_percent": round(((recent_avg - older_avg) / older_avg * 100), 1) if older_avg > 0 else 0
                }
        
        return trends
    
    def _generate_recommendations(self) -> List[str]:
        """Gera recomendações baseadas nas métricas"""
        
        recommendations = []
        
        # Verificar CPU
        if self.system_metrics["cpu_usage"]:
            recent_cpu = [v["value"] for v in self.system_metrics["cpu_usage"][-5:]]
            avg_cpu = sum(recent_cpu) / len(recent_cpu)
            
            if avg_cpu > 80:
                recommendations.append("CPU usage is high - consider scaling resources")
            elif avg_cpu > 60:
                recommendations.append("Monitor CPU usage - approaching high levels")
        
        # Verificar memória
        if self.system_metrics["memory_usage"]:
            recent_memory = [v["value"] for v in self.system_metrics["memory_usage"][-5:]]
            avg_memory = sum(recent_memory) / len(recent_memory)
            
            if avg_memory > 85:
                recommendations.append("Memory usage is critical - restart service or scale")
            elif avg_memory > 70:
                recommendations.append("Memory usage is elevated - monitor closely")
        
        # Verificar erros
        if self.total_errors > 0:
            error_rate = self.total_errors / self.total_requests if self.total_requests > 0 else 0
            if error_rate > 0.05:
                recommendations.append("High error rate detected - review logs and fix issues")
        
        # Verificar requests ativas
        if self.active_requests > 5:
            recommendations.append("Many active requests - consider request queuing")
        
        # Recomendações gerais
        if not recommendations:
            recommendations.append("System is performing well - continue monitoring")
        
        return recommendations
    
    def stop_monitoring(self):
        """Para o monitoramento"""
        self._monitoring_active = False
        logger.info("🛑 Performance Monitor parado")
