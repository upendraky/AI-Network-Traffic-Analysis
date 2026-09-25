import threading
import time
from typing import Optional

from scapy.all import sniff

from app.network.capture import NetworkCapture


class NetworkMonitor:
    """
    Continuous network monitoring service.

    Responsibilities:
        - Start background packet capture.
        - Stop packet capture safely.
        - Periodically expire inactive flows.
        - Reuse NetworkCapture for packet processing,
          AI classification and database persistence.
        - Expose monitoring status.
        - Handle capture errors without crashing FastAPI.
        - Keep monitor state consistent when capture fails.

    Architecture:

        Scapy
          ↓
        NetworkCapture
          ↓
        FlowManager
          ↓
        XGBoost
          ↓
        SQLite

    The class is independent of FastAPI.
    FastAPI interacts with the application-level monitor
    through start_monitor(), stop_monitor() and
    get_monitor_status().
    """

    def __init__(
        self,
        flow_timeout: float = 30.0,
        timeout_check_interval: float = 1.0,
    ):
        """
        Initialize the monitoring service.

        Args:
            flow_timeout:
                Seconds of inactivity before a flow is completed.

            timeout_check_interval:
                How often inactive flows are checked.
        """

        self.capture = NetworkCapture(
            flow_timeout=flow_timeout
        )

        self.timeout_check_interval = timeout_check_interval

        self.running = False

        self.started_at: Optional[float] = None
        self.stopped_at: Optional[float] = None

        self.last_error: Optional[str] = None

        self._capture_thread: Optional[threading.Thread] = None
        self._monitor_thread: Optional[threading.Thread] = None

        self._stop_event = threading.Event()
        self._lock = threading.Lock()

    # ==================================================================
    # INTERNAL ERROR HANDLING
    # ==================================================================

    def _set_error(self, error: Exception) -> None:
        """
        Store a readable error message and print it.

        This keeps worker exceptions visible through the API
        without allowing them to crash the FastAPI process.
        """

        message = f"{type(error).__name__}: {error}"

        self.last_error = message

        print("\n[NTA MONITOR ERROR]")
        print(message)

    # ==================================================================
    # PACKET CAPTURE WORKER
    # ==================================================================

    def _capture_worker(self) -> None:
        """
        Background Scapy capture worker.

        Timeout-based sniffing is used instead of an unlimited
        blocking sniff() call so the monitor can stop cleanly.

        If Scapy cannot access the network interface, the worker
        records the error and stops the monitor instead of leaving
        the API reporting a false running state.
        """

        capture_failed = False

        try:
            while not self._stop_event.is_set():

                sniff(
                    prn=self.capture.process_packet,
                    store=False,
                    timeout=1,
                )

        except Exception as exc:
            capture_failed = True

            self._set_error(exc)

            self.capture.last_error = str(exc)

        finally:
            self._stop_event.set()

            if capture_failed:
                with self._lock:
                    self.running = False
                    self.capture.running = False
                    self.capture.stopped_at = time.time()
                    self.stopped_at = time.time()

    # ==================================================================
    # FLOW TIMEOUT WORKER
    # ==================================================================

    def _timeout_worker(self) -> None:
        """
        Periodically check for inactive flows.

        This is important because a flow can become inactive even
        when no new packet arrives.
        """

        try:
            while not self._stop_event.wait(
                self.timeout_check_interval
            ):
                self.capture.expire_flows()

        except Exception as exc:
            self._set_error(exc)

            self.capture.last_error = str(exc)

            self._stop_event.set()

            with self._lock:
                self.running = False
                self.capture.running = False
                self.capture.stopped_at = time.time()
                self.stopped_at = time.time()

    # ==================================================================
    # START
    # ==================================================================

    def start(self) -> bool:
        """
        Start continuous network monitoring.

        Returns:
            True if monitoring was started.
            False if it was already running.
        """

        with self._lock:

            if self.running:
                return False

            # Clear state from the previous run.
            self.last_error = None
            self.capture.last_error = None

            self._stop_event.clear()

            self.capture.running = True

            self.capture.packets_captured = 0
            self.capture.flows_analyzed = 0

            self.capture.started_at = time.time()
            self.capture.stopped_at = None

            self.started_at = time.time()
            self.stopped_at = None

            self.running = True

            self._capture_thread = threading.Thread(
                target=self._capture_worker,
                name="nta-packet-capture",
                daemon=True,
            )

            self._monitor_thread = threading.Thread(
                target=self._timeout_worker,
                name="nta-flow-monitor",
                daemon=True,
            )

            self._capture_thread.start()
            self._monitor_thread.start()

        print("=" * 60)
        print("NTA CONTINUOUS MONITORING STARTED")
        print("=" * 60)

        return True

    # ==================================================================
    # STOP
    # ==================================================================

    def stop(self) -> bool:
        """
        Stop continuous monitoring safely.

        Returns:
            True if monitoring was stopped.
            False if monitoring was not running.
        """

        with self._lock:

            if not self.running:
                return False

            print("\nStopping NTA continuous monitoring...")

            self._stop_event.set()

            capture_thread = self._capture_thread
            monitor_thread = self._monitor_thread

        # Wait outside the lock so worker threads can finish safely.
        if capture_thread is not None:
            capture_thread.join(timeout=5)

        if monitor_thread is not None:
            monitor_thread.join(timeout=5)

        # Complete and analyze any remaining active flows.
        try:
            self.capture.flush_flows()

        except Exception as exc:
            self._set_error(exc)
            self.capture.last_error = str(exc)

        with self._lock:

            self.running = False

            self.capture.running = False
            self.capture.stopped_at = time.time()

            self.stopped_at = time.time()

            self._capture_thread = None
            self._monitor_thread = None

        print("NTA continuous monitoring stopped.")

        return True

    # ==================================================================
    # STATUS
    # ==================================================================

    def get_status(self) -> dict:
        """
        Return complete monitoring status.

        This structure is consumed by FastAPI and the React dashboard.
        """

        capture_status = self.capture.get_status()

        return {
            "running": self.running,

            "started_at": self.started_at,

            "stopped_at": self.stopped_at,

            "packets_captured": (
                capture_status["packets_captured"]
            ),

            "flows_analyzed": (
                capture_status["flows_analyzed"]
            ),

            "active_flows": (
                capture_status["active_flows"]
            ),

            "completed_flows": (
                capture_status["completed_flows"]
            ),

            "last_error": (
                self.last_error
                or capture_status["last_error"]
            ),
        }

    # ==================================================================
    # RESET
    # ==================================================================

    def reset(self) -> bool:
        """
        Reset monitoring state.

        Monitoring must be stopped before resetting.
        """

        with self._lock:

            if self.running:
                return False

            flow_timeout = self.capture.flow_manager.timeout

            self.capture = NetworkCapture(
                flow_timeout=flow_timeout
            )

            self.started_at = None
            self.stopped_at = None
            self.last_error = None

            self._capture_thread = None
            self._monitor_thread = None

            self._stop_event.clear()

        return True


# ======================================================================
# SINGLE APPLICATION-LEVEL MONITOR
# ======================================================================

_monitor = NetworkMonitor()


def get_monitor() -> NetworkMonitor:
    """
    Return the application-level NetworkMonitor instance.

    FastAPI and the command-line entry point use the same monitor.
    """

    return _monitor


def start_monitor() -> bool:
    """
    Start the application-level continuous monitor.
    """

    return _monitor.start()


def stop_monitor() -> bool:
    """
    Stop the application-level continuous monitor.
    """

    return _monitor.stop()


def get_monitor_status() -> dict:
    """
    Return application-level monitoring status.
    """

    return _monitor.get_status()


# ======================================================================
# COMMAND-LINE ENTRY POINT
# ======================================================================

if __name__ == "__main__":
    monitor = get_monitor()

    try:
        monitor.start()

        print()
        print("Monitoring live network traffic.")
        print("Press Ctrl+C to stop.")
        print()

        while monitor.running:
            time.sleep(1)

    except KeyboardInterrupt:
        print("\nKeyboard interrupt received.")

    finally:
        monitor.stop()