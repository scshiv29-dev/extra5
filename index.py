import os
import asyncio

import discord

from utils import default
from utils.data import Bot, HelpFormat

intents = discord.Intents.default()
intents.message_content = True

config = default.get("config.json")
print("Logging in...")

bot = Bot(
    command_prefix=config.prefix,
    prefix=config.prefix,
    command_attrs=dict(hidden=True),
    intents=intents,
    help_command=HelpFormat()
)
async def cogoo():
   for file in os.listdir("cogs"):
    if file.endswith(".py"):
        name = file[:-3]
        print(name)
        await bot.load_extension(f"cogs.{name}")

asyncio.run(cogoo())

bot.run(config.token)
