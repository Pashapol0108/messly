from pydantic import BaseModel, Field, EmailStr
from typing import Optional

class Token(BaseModel):
    access_token: str
    token_type: str

class UserIn(BaseModel):
    email: str
    username: str
    password: str

class ChatCreate(BaseModel):
    name: str

class AddMemberRequest(BaseModel):
    username: str

class RemoveMemberRequest(BaseModel):
    username: str

class PersonalChatRequest(BaseModel):
    username: str

class UsernameUpdateRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)

class UpdateDescriptionRequest(BaseModel):
    description: str

class UserProfile(BaseModel):
    username: str
    avatar: str
    description: Optional[str]
    status: str

    class Config:
        orm_mode = True

class ChatNameUpdate(BaseModel):
    new_name: str

class UserUpdate(BaseModel):
    username: str
    email: str
    role: str