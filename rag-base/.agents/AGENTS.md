# OpenTelemetry & FastAPI Tracing Rules

## 1. FastAPI Route Instrumentation
- **Do not use synchronous custom tracing decorators (like `@traced`) on `async def` FastAPI endpoints.** Placing `@traced` above `@app.get(...)` causes the decorator to be skipped by FastAPI's router. Placing a synchronous `@traced` decorator below `@app.get(...)` wraps the async endpoint in a synchronous function, causing spans to close before the coroutine is awaited (`with tracer.start_as_current_span(...)` exits upon returning the coroutine object).
- **Use `FastAPIInstrumentor` for route tracing**: To trace FastAPI routes (`/sessions`, `/chat`, `/stream`), use OpenTelemetry's built-in FastAPI instrumentation (`FastAPIInstrumentor.instrument_app(app)` from `opentelemetry.instrumentation.fastapi`). This automatically instruments all route handlers, preserves `Depends(...)` dependency injection, and correctly manages spans across `async/await` boundaries.

## 2. Tracing Async Functions & Generators (`async def`)
- If creating or modifying a custom `@traced` decorator that wraps coroutine functions (`async def`), the decorator **must check `inspect.iscoroutinefunction(func)`** and return an `async def async_wrapper(*args, **kwargs):` that awaits `func(*args, **kwargs)` inside the `with tracer.start_as_current_span(...)` block:
  ```python
  import inspect
  from functools import wraps

  def traced(span_name=""):
      def decorator(func):
          name = span_name if span_name else func.__name__
          if inspect.iscoroutinefunction(func):
              @wraps(func)
              async def async_wrapper(*args, **kwargs):
                  with tracer.start_as_current_span(name):
                      return await func(*args, **kwargs)
              return async_wrapper
          else:
              @wraps(func)
              def sync_wrapper(*args, **kwargs):
                  with tracer.start_as_current_span(name):
                      return func(*args, **kwargs)
              return sync_wrapper
      return decorator
  ```
- **Async Generator Tracing (`async def stream_conversation`)**: For streaming generators (`yield`), spans close when the function returns a generator object. To trace generator yields, wrap the generator loop inside `with tracer.start_as_current_span(...)` or yield from inside an async generator wrapper.
