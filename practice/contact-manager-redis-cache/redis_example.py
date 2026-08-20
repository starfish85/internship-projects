import redis


r = redis.Redis(
    host="127.0.0.1",
    port=6379,
    db=0,
    decode_responses=True,
    protocol=2,
)

r.set("test_key", "hello")
print(r.get("test_key"))
