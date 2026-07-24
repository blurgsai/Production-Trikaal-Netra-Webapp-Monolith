import logging
import os
import sys
from logging.handlers import RotatingFileHandler
from pythonjsonlogger import jsonlogger
import colorlog


class Logger:
    def __init__(
        self,
        module_name: str,
        log_level: str = "INFO",
        max_log_size: int = 5 * 1024 * 1024,
    ):
        self.module_name = module_name
        self.log_dir = os.path.join("logs", module_name)
        os.makedirs(self.log_dir, exist_ok=True)

        # Standard log format with colors (for console)
        log_format = (
            "%(log_color)s%(levelname)s%(reset)s | "
            f"%(cyan)s{self.module_name}%(reset)s | "
            "%(asctime)s | %(message)s"
        )
        console_formatter = colorlog.ColoredFormatter(
            log_format,
            log_colors={
                "DEBUG": "green",
                "INFO": "blue",
                "WARNING": "yellow",
                "ERROR": "red",
                "CRITICAL": "bold_red",
            },
            secondary_log_colors={
                "asctime": {"color": "white"},
            },
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        
        # Simple format for file logging
        file_format = f"%(levelname)s | {self.module_name} | %(asctime)s | %(message)s"
        file_formatter = logging.Formatter(
            file_format,
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        
        # JSON log format
        json_formatter = jsonlogger.JsonFormatter(
            f"%(levelname)s {self.module_name} %(asctime)s %(message)s"
        )

        # Create log file handler - all levels
        log_file = os.path.join(self.log_dir, f"{module_name}.log")
        file_handler = RotatingFileHandler(
            log_file, maxBytes=max_log_size, backupCount=5
        )
        file_handler.setFormatter(file_formatter)
        file_handler.setLevel(logging.DEBUG)  # File gets all levels

        # Create JSON log file handler - all levels
        json_log_file = os.path.join(self.log_dir, f"{module_name}.json")
        json_handler = RotatingFileHandler(
            json_log_file, maxBytes=max_log_size, backupCount=5
        )
        json_handler.setFormatter(json_formatter)
        json_handler.setLevel(logging.DEBUG)  # JSON gets all levels

        # Create console handler - only INFO and above
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(console_formatter)
        console_handler.setLevel(logging.INFO)  # Console only shows INFO+

        # Configure logger
        self.logger = logging.getLogger(module_name)
        self.logger.setLevel(logging.DEBUG)  # Logger accepts all, handlers filter
        self.logger.addHandler(console_handler)
        self.logger.addHandler(file_handler)
        self.logger.addHandler(json_handler)
        # Prevent propagation to avoid duplicate logs
        self.logger.propagate = False

    def get_logger(self):
        return self.logger


# Example usage
if __name__ == "__main__":
    logger = Logger(__name__).get_logger()
    logger.debug("This is a debug message")
    logger.info("This is an info message")
    logger.warning("This is a warning message")
    logger.error("This is an error message")
    logger.critical("This is a critical message")
