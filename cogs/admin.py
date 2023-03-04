import time
import aiohttp
import discord
import importlib
import os
import sys

from discord.ext import commands
from utils import permissions, default, http, dataIO


class Admin(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.config = default.get("config.json")
        self._last_result = None

    @commands.command()
    async def amiadmin(self, ctx):
        """ Are you an admin? """
        if ctx.author.id in self.config.owners:
            return await ctx.send(f"Yes **{ctx.author.name}** you are an admin! ✅")

        # Please do not remove this part.
        # I would love to be credited as the original creator of the source code.
        #   -- AlexFlipnote
        if ctx.author.id == 398102475300798465:
            return await ctx.send(f"Well kinda **{ctx.author.name}**.. you still own the source code")

        await ctx.send(f"No,you aren't that lucky{ctx.author.name}")

    @commands.command()
    @commands.check(permissions.is_owner)
    async def load(self, ctx, name: str):
        """ Loads an extension. """
        try:
            await self.bot.load_extension(f"cogs.{name}")
        except Exception as e:
            return await ctx.send(default.traceback_maker(e))
        await ctx.send(f"Loaded extension **{name}.py**")

    @commands.command()
    @commands.check(permissions.is_owner)
    async def unload(self, ctx, name: str):
        """ Unloads an extension. """
        try:
            await self.bot.unload_extension(f"cogs.{name}")
        except Exception as e:
            return await ctx.send(default.traceback_maker(e))
        await ctx.send(f"Unloaded extension **{name}.py**")

    @commands.command()
    @commands.check(permissions.is_owner)
    async def reload(self, ctx, name: str):
        """ Reloads an extension. """
        try:
            self.bot.reload_extension(f"cogs.{name}")
        except Exception as e:
            return await ctx.send(default.traceback_maker(e))
        await ctx.send(f"Reloaded extension **{name}.py**")

    @commands.command()
    @commands.check(permissions.is_owner)
    async def reloadall(self, ctx):
        """ Reloads all extensions. """
        error_collection = []
        for file in os.listdir("cogs"):
            if file.endswith(".py"):
                name = file[:-3]
                try:
                    await self.bot.reload_extension(f"cogs.{name}")
                except Exception as e:
                    error_collection.append(
                        [file, default.traceback_maker(e, advance=False)]
                    )

        if error_collection:
            output = "\n".join([f"**{g[0]}** ```diff\n- {g[1]}```" for g in error_collection])
            return await ctx.send(
                f"Attempted to reload all extensions, was able to reload, "
                f"however the following failed...\n\n{output}"
            )

        await ctx.send("Successfully reloaded all extensions")

    @commands.command()
    @commands.check(permissions.is_owner)
    async def reloadutils(self, ctx, name: str):
        """ Reloads a utils module. """
        name_maker = f"utils/{name}.py"
        try:
            module_name = importlib.import_module(f"utils.{name}")
            importlib.reload(module_name)
        except ModuleNotFoundError:
            return await ctx.send(f"Couldn't find module named **{name_maker}**")
        except Exception as e:
            error = default.traceback_maker(e)
            return await ctx.send(f"Module **{name_maker}** returned error and was not reloaded...\n{error}")
        await ctx.send(f"Reloaded module **{name_maker}**")

    @commands.command()
    @commands.check(permissions.is_owner)
    async def reboot(self, ctx):
        """ Reboot the bot """
        await ctx.send('Rebooting now...')
        time.sleep(1)
        sys.exit(0)

    @commands.command()
    @commands.check(permissions.is_owner)
    async def dm(self, ctx, user_id: int, *, message: str):
        """ DM the user of your choice """
        user = self.bot.get_user(user_id)
        if not user:
            return await ctx.send(f"Could not find any UserID matching **{user_id}**")

        try:
            await user.send(message)
            await ctx.send(f"✉️ Sent a DM to **{user_id}**")
        except discord.Forbidden:
            await ctx.send("This user might be having DMs blocked or it's a bot account...")

    @commands.group()
    @commands.check(permissions.is_owner)
    async def change(self, ctx):
        if ctx.invoked_subcommand is None:
            await ctx.send_help(str(ctx.command))

    @change.command(name="playing")
    @commands.check(permissions.is_owner)
    async def change_playing(self, ctx, *, playing: str):
        """ Change playing status. """
        if self.config.status_type == "idle":
            status_type = discord.Status.idle
        elif self.config.status_type == "dnd":
            status_type = discord.Status.dnd
        else:
            status_type = discord.Status.online

        if self.config.playing_type == "listening":
            playing_type = 2
        elif self.config.playing_type == "watching":
            playing_type = 3
        else:
            playing_type = 0

        try:
            await self.bot.change_presence(
                activity=discord.Activity(type=playing_type, name=playing),
                status=status_type
            )
            dataIO.change_value("config.json", "playing", playing)
            await ctx.send(f"Successfully changed playing status to **{playing}**")
        except discord.InvalidArgument as err:
            await ctx.send(err)
        except Exception as e:
            await ctx.send(e)

    @change.command(name="username")
    @commands.check(permissions.is_owner)
    async def change_username(self, ctx, *, name: str):
        """ Change username. """
        try:
            await self.bot.user.edit(username=name)
            await ctx.send(f"Successfully changed username to **{name}**")
        except discord.HTTPException as err:
            await ctx.send(err)

    @change.command(name="nickname")
    @commands.check(permissions.is_owner)
    async def change_nickname(self, ctx, *, name: str = None):
        """ Change nickname. """
        try:
            await ctx.guild.me.edit(nick=name)
            if name:
                await ctx.send(f"Successfully changed nickname to **{name}**")
            else:
                await ctx.send("Successfully removed nickname")
        except Exception as err:
            await ctx.send(err)

    @change.command(name="avatar")
    @commands.check(permissions.is_owner)
    async def change_avatar(self, ctx, url: str = None):
        """ Change avatar. """
        if url is None and len(ctx.message.attachments) == 1:
            url = ctx.message.attachments[0].url
        else:
            url = url.strip('<>') if url else None

        try:
            bio = await http.get(url, res_method="read")
            await self.bot.user.edit(avatar=bio)
            await ctx.send(f"Successfully changed the avatar. Currently using:\n{url}")
        except aiohttp.InvalidURL:
            await ctx.send("The URL is invalid...")
        except discord.InvalidArgument:
            await ctx.send("This URL does not contain a useable image")
        except discord.HTTPException as err:
            await ctx.send(err)
        except TypeError:
            await ctx.send("You need to either provide an image URL or upload one with the command")


    @change.command(aliases=["purge","harpic"])
    @commands.check(permissions.is_owner)
    async def clear(self,ctx,amount):
        await ctx.channel.purge(limit=amount)
        await ctx.send(f"Cleared {amount} messages")

    

    @commands.command()
    @commands.check(permissions.is_owner)
    async def announce(self,ctx,member:discord.Member=None):
        ''' Announcement Command'''
        if member==None:
            member=ctx.author


        name=member.display_name
        pfp=member.display_avatar

        topic='''The U.S. Securities and Exchange Commission (SEC) requires the following legal notices (Disclosure)'''
        desc='''All material presented within this Elite Signals Server is not to be regarded as investment advice, but for general informational purposes only. Day trading does involve risk, so caution must always be utilized. We cannot guarantee profits or freedom from loss. You assume the entire cost and risk of any trading you choose to undertake. You are solely responsible for making your own investment decisions. Owners of Elite Signals, its representatives, its principals, its moderators, and its members, are NOT registered as securities broker-dealers or investment advisors either with the U.S. Securities and Exchange Commission or with any state securities regulatory authority. We recommend consulting with a registered investment advisor, broker-dealer, and/or financial advisor. If you choose to invest with or without seeking advice from such an advisor or entity, then any consequences resulting from your investments are your sole responsibility. By entering or using Elite Signals or using our content on the web/server, you are indicating your consent and agreement to our disclaimer.'''
        
        embed=discord.Embed(title=topic,description=desc,color=discord.Colour.random())
        embed.set_author(name=f"Rules",icon_url="https://ik.imagekit.io/ywnllpqmg/loudspeaker.png?ik-sdk-version=javascript-1.4.3&updatedAt=1677908236890")
        embed.set_thumbnail(url="https://ik.imagekit.io/ywnllpqmg/afklogo?ik-sdk-version=javascript-1.4.3&updatedAt=1677908281473")
        embed.add_field(name="Racism",value="""Be respectful with all members
Be respectful to others , No death threats, sexism, hate speech, racism
(NO N WORD, this includes soft N)
No doxxing, swatting, witch hunting""",inline=False)
        embed.add_field(name="No Advertising",value="""Includes DM Advertising. We do not allow advertising here of any kind.
If Caught We Will Ban You Never send affiliate links or links to other youtubers or traders inside our community
""",inline=False)
        embed.add_field(name="No spamming in text or VC",value="""Do not spam messages, soundboards, voice changers,
or ear rape in any channel.""",inline=False)
        embed.add_field(name="No malicious content",value="""No grabify links, viruses, crash videos, links to viruses,
or token grabbers. These will result in an automated ban.""",inline=False)
        embed.add_field(name="No Self Bots",value="""Includes all kinds of selfbots: Nitro snipers, selfbots like
nighty, auto changing statuses .""",inline=False)        
        embed.add_field(name="RESPECT ALL SERVER MEMBERS",value="""Any form of hate speech or offensive communication will not be allowed on the server and will result in a permanent ban.""",inline=False)        
        embed.add_field(name="NO NSFW CONTENT:",value="""The sharing and posting of explicit or inappropriate content is strictly prohibited on the server.""",inline=False)
        embed.add_field(name="NO SPAMMING:",value="""Refrain from spamming messages in the general chat as you will be subjected to a cooldown or be muted for a specified period of time.""",inline=False)
        embed.add_field(name="NO EXTERNAL LINKS:",value="""Links connecting users to other servers, social media pages and phishing sites will not be tolerated and will result in either a warning or permanent ban.""",inline=False)
        embed.add_field(name="NO SHARING VIP CONTENT:",value="""The sharing of VIP trades and content is strictly prohibited and will result in a permanent ban from the server.""",inline=False)
        embed.add_field(name="Follow Discord's TOS :",value="""https://discordapp.com/terms
https://discordapp.com/guidelines""",inline=False)
        await ctx.send(embed=embed)
    
    
async def setup(bot):
    await bot.add_cog(Admin(bot))
