import logging
import contextlib

logging.getLogger("blurgs_observability").addHandler(logging.NullHandler())


def init_observability(*args, **kwargs):
    pass


def shutdown_observability(*args, **kwargs):
    pass


def get_logger(name=None, *args, **kwargs):
    return logging.getLogger(name or __name__)


class _TracedDecorator:
    def __init__(self, *args, **kwargs):
        pass

    def __call__(self, func):
        return func


def traced(*args, **kwargs):
    if len(args) == 1 and callable(args[0]) and not kwargs:
        return args[0]
    return _TracedDecorator(*args, **kwargs)


def setup_auto_instrumentation(*args, **kwargs):
    pass
