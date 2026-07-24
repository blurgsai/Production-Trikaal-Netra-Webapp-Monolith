from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from features.topics.models import CreateTopicConfigRequest, TopicConfig, UpdateTopicConfigRequest
from features.topics.services import (
    create_topic_config,
    delete_topic_config_service,
    get_topic_config,
    list_topic_configs,
    update_topic_config_service,
)
from shared.dependencies import api_key_guard, get_db

router = APIRouter(prefix="/topics", tags=["Topics"])


@router.get("", response_model=list[TopicConfig])
async def list_topics(
    db: AsyncIOMotorDatabase = Depends(get_db),
    _: str = Depends(api_key_guard),
):
    return await list_topic_configs(db)


@router.get("/{topic}", response_model=TopicConfig)
async def get_topic(
    topic: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    _: str = Depends(api_key_guard),
):
    return await get_topic_config(db, topic)


@router.post("", response_model=TopicConfig, status_code=201)
async def create_topic(
    req: CreateTopicConfigRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    _: str = Depends(api_key_guard),
):
    return await create_topic_config(db, req)


@router.patch("/{topic}", response_model=TopicConfig)
async def update_topic(
    topic: str,
    req: UpdateTopicConfigRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    _: str = Depends(api_key_guard),
):
    return await update_topic_config_service(db, topic, req)


@router.delete("/{topic}", status_code=204)
async def delete_topic(
    topic: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    _: str = Depends(api_key_guard),
):
    await delete_topic_config_service(db, topic)
