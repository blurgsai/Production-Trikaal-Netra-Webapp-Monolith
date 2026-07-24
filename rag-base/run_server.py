from dotenv import load_dotenv
from blurgs_observability import init_observability, shutdown_observability, get_logger
from blurgs_observability.decorators.tracing_function import traced



if __name__ == "__main__":
    load_dotenv()
    init_observability(
        None,
        'tool-server',
        json_file_log_level="INFO",
        console_log_level="DEBUG",
        otel_log_level="INFO",
    )
    logger = get_logger()
    logger.info("Starting tool server...")
    from tool_server.server import main

    try:
        # traced()(main)()
        main()
        logger.info("Tool server running.")
    except Exception as e:
        logger.error("Error occurred while running tool server.")
        logger.error(e, exc_info=True)
    finally:
        shutdown_observability()
        logger.info("Tool server shutdown complete.")