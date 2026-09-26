"""Populate the database with realistic demo data.

Usage:
    python manage.py seed            # idempotent — safe to run repeatedly
    python manage.py seed --no-images

Every demo account uses the password "network123". Images (avatars, covers and
post photos) are generated procedurally with Pillow so the seed needs no
network access and no binary assets in the repository.
"""

import io
import math
import random

from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.db import transaction
from PIL import Image, ImageDraw, ImageFont

from apps.notifications.models import Notification
from apps.posts.models import NO_IMAGE, Bookmark, Comment, Post, PostLike
from apps.posts.services import notify_mentions, sync_hashtags
from apps.users.models import Follow

User = get_user_model()

DEMO_PASSWORD = "network123"

PEOPLE = [
    (
        "ada",
        "Ada",
        "Lovelace",
        "Software Engineer · Distributed Systems",
        "London, UK",
        "Building things that scale. Previously @ Analytical Engines Inc.",
        "https://ada.dev",
    ),
    (
        "grace",
        "Grace",
        "Hopper",
        "Compiler Engineer · Speaker",
        "Arlington, VA",
        "I like to teach machines to speak human. COBOL was just the beginning.",
        "",
    ),
    (
        "linus",
        "Linus",
        "Torvalds",
        "Kernel Maintainer",
        "Portland, OR",
        "Just here for the merge conflicts.",
        "https://kernel.org",
    ),
    (
        "margaret",
        "Margaret",
        "Hamilton",
        "Director of Software Engineering",
        "Boston, MA",
        "Software engineering is what got us to the moon. Reliability above all.",
        "",
    ),
    (
        "alan",
        "Alan",
        "Turing",
        "Researcher · Computability & AI",
        "Cambridge, UK",
        "Can machines think? Asking for a friend.",
        "",
    ),
    (
        "katherine",
        "Katherine",
        "Johnson",
        "Data Scientist · Orbital Mechanics",
        "Hampton, VA",
        "I love numbers, and numbers love me back.",
        "",
    ),
    (
        "tim",
        "Tim",
        "Berners-Lee",
        "Web Architect",
        "Geneva, CH",
        "I made a thing called the web. Still fixing it.",
        "https://www.w3.org",
    ),
    (
        "hedy",
        "Hedy",
        "Lamarr",
        "Inventor · Wireless Systems",
        "Los Angeles, CA",
        "Frequency hopping by day, film by night.",
        "",
    ),
]

# (author, content, has_image)
POSTS = [
    (
        "ada",
        "Shipped our new event-driven pipeline today. 40% lower latency and the on-call "
        "rotation finally sleeps at night. The trick? Stop fighting backpressure — embrace it. "
        "#distributed #engineering",
        True,
    ),
    (
        "grace",
        "Hot take: the most valuable skill in engineering isn't writing code, it's deleting it. "
        "Today I removed 4,000 lines and the test suite got faster AND greener. #cleancode",
        False,
    ),
    (
        "linus",
        "Code review tip: if the diff needs a 10-paragraph explanation, the diff is wrong. "
        "Split it. Your reviewers will thank you, and future-you will thank them. #codereview",
        False,
    ),
    (
        "margaret",
        "We don't rise to the level of our ambitions, we fall to the level of our error "
        "handling. Write the failure path first. #engineering #reliability",
        False,
    ),
    (
        "alan",
        "Spent the weekend building a tiny neural net from scratch. No frameworks, just math. "
        "Best way to actually understand backprop — highly recommend the exercise. #ai #python",
        True,
    ),
    (
        "katherine",
        "Data quality > model complexity. Every single time. Spent two days cleaning a "
        "dataset and the 'boring' linear model now beats last quarter's deep net. #datascience",
        False,
    ),
    (
        "tim",
        "Reminder that the web was designed to be decentralized. Own your data, own your "
        "identity. The pendulum is finally swinging back and I'm here for it. #openweb",
        False,
    ),
    (
        "hedy",
        "Patent filed! 📡 New approach to spread-spectrum scheduling for congested networks. "
        "Sometimes the best ideas come from completely unrelated fields. #wireless #engineering",
        True,
    ),
    (
        "ada",
        "Mentoring question I ask every junior engineer: 'What does this code do when it fails?' "
        "If you can't answer that, you're not done yet. cc @margaret",
        False,
    ),
    (
        "grace",
        "A ship in port is safe, but that's not what ships are built for. "
        "Ship the feature. Gather the data. Iterate. #leadership",
        False,
    ),
    ("linus", "Talk is cheap. Show me the code.", False),
    (
        "katherine",
        "Like what you do, and then you will do your best. Took me years to learn "
        "that motivation beats raw talent over any meaningful timescale.",
        True,
    ),
    (
        "tim",
        "Great thread by @ada on backpressure — this is the mindset shift most teams are missing. "
        "#distributed",
        False,
    ),
    ("margaret", "Sunset from the office roof after a 14-hour launch day. Worth it. 🌅", True),
    (
        "alan",
        "Reading list for the weekend: category theory, a paper on retrieval-augmented "
        "generation and a novel. Balance. #ai #reading",
        False,
    ),
    (
        "hedy",
        "Reminder: the best network is the one nobody notices. Zero drops this quarter. "
        "#wireless #reliability",
        False,
    ),
]

QUOTES = [
    (
        "hedy",
        2,
        "Deleting code is my favourite refactor too. Every line removed is a bug that "
        "can't happen anymore. #cleancode",
    ),
    ("alan", 6, "This. Reproducibility starts with the data, not the model."),
]

REPOSTS = [("tim", 0), ("katherine", 3), ("ada", 4), ("grace", 7), ("linus", 1)]

COMMENTS = [
    "Completely agree — we saw the same thing on our team.",
    "This is the way.",
    "Could you share more details? Genuinely curious about the implementation.",
    "Saving this one. 🔖",
    "Strong disagree, but I respect the take.",
    "We tried this last quarter and it paid off massively.",
    "Underrated point. More people need to hear this.",
    "Brilliant as always!",
]

REPLIES = [
    "Thanks! Happy to write it up in more detail.",
    "Fair point — context matters a lot here.",
    "Exactly what I was thinking.",
]

PALETTES = [
    ((99, 102, 241), (168, 85, 247)),
    ((14, 165, 233), (34, 211, 238)),
    ((16, 185, 129), (45, 212, 191)),
    ((244, 63, 94), (251, 146, 60)),
    ((139, 92, 246), (217, 70, 239)),
    ((245, 158, 11), (250, 204, 21)),
    ((37, 99, 235), (129, 140, 248)),
]


def _lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def gradient(size, start, end, angle_deg=35):
    """Linear gradient image using a rotated coordinate."""
    width, height = size
    image = Image.new("RGB", size)
    pixels = image.load()
    angle = math.radians(angle_deg)
    cos_a, sin_a = math.cos(angle), math.sin(angle)
    span = abs(width * cos_a) + abs(height * sin_a)
    for y in range(height):
        for x in range(width):
            t = (x * cos_a + y * sin_a) / span
            pixels[x, y] = _lerp(start, end, max(0.0, min(1.0, t)))
    return image


def abstract_image(rng: random.Random, size, palette):
    """Gradient background with translucent geometric shapes — looks like a photo thumbnail."""
    image = gradient(size, *palette, angle_deg=rng.randint(15, 75)).convert("RGBA")
    overlay = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    width, height = size
    for _ in range(rng.randint(4, 7)):
        radius = rng.randint(width // 8, width // 3)
        x, y = rng.randint(-radius // 2, width), rng.randint(-radius // 2, height)
        alpha = rng.randint(40, 110)
        tint = (255, 255, 255, alpha) if rng.random() > 0.35 else (0, 0, 0, alpha // 2)
        if rng.random() > 0.5:
            draw.ellipse([x, y, x + radius, y + radius], fill=tint)
        else:
            draw.polygon(
                [
                    (x, y),
                    (x + radius, y + rng.randint(0, radius)),
                    (x + rng.randint(0, radius), y + radius),
                ],
                fill=tint,
            )
    return Image.alpha_composite(image, overlay).convert("RGB")


def avatar_image(rng: random.Random, initials: str, palette):
    size = (512, 512)
    image = abstract_image(rng, size, palette)
    draw = ImageDraw.Draw(image)
    font = ImageFont.load_default(size=200)  # Pillow's bundled scalable font
    draw.text((256, 256), initials, fill=(255, 255, 255), font=font, anchor="mm")
    return image


def to_content_file(image: Image.Image, name: str) -> ContentFile:
    buffer = io.BytesIO()
    image.save(buffer, format="WEBP", quality=82)
    return ContentFile(buffer.getvalue(), name=name)


class Command(BaseCommand):
    help = (
        "Seed the database with demo users, posts, follows, likes, comments, reposts and bookmarks."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--no-images",
            action="store_true",
            help="Skip generating avatars, covers and post photos.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        rng = random.Random(42)  # relations — must stay stable between runs
        image_rng = random.Random(7)  # image generation — consumed only when files are created
        with_images = not options["no_images"]

        users = {}
        for index, (username, first, last, headline, location, bio, website) in enumerate(PEOPLE):
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    "email": f"{username}@network.dev",
                    "first_name": first,
                    "last_name": last,
                    "headline": headline,
                    "location": location,
                    "bio": bio,
                    "website": website,
                },
            )
            if created:
                user.set_password(DEMO_PASSWORD)
                user.save(update_fields=["password"])
            palette = PALETTES[index % len(PALETTES)]
            if with_images and not user.avatar and index % 2 == 0:
                user.avatar.save(
                    f"{username}.webp",
                    to_content_file(
                        avatar_image(image_rng, (first[0] + last[0]).upper(), palette), "a.webp"
                    ),
                    save=True,
                )
            if with_images and not user.cover and index % 3 == 0:
                user.cover.save(
                    f"{username}-cover.webp",
                    to_content_file(abstract_image(image_rng, (1600, 600), palette), "c.webp"),
                    save=True,
                )
            users[username] = user
        self.stdout.write(f"Users: {len(users)}")

        # Follows — everyone follows 3-5 others, deterministically
        follow_count = 0
        usernames = list(users)
        for username in usernames:
            others = [u for u in usernames if u != username]
            for target in rng.sample(others, k=rng.randint(3, 5)):
                _, created = Follow.objects.get_or_create(
                    follower=users[username], following=users[target]
                )
                follow_count += created
                if created:
                    Notification.objects.get_or_create(
                        recipient=users[target],
                        actor=users[username],
                        verb=Notification.Verb.FOLLOW,
                    )
        self.stdout.write(f"Follows created: {follow_count}")

        posts = []
        for index, (username, content, has_image) in enumerate(POSTS):
            post, created = Post.objects.get_or_create(author=users[username], content=content)
            if created:
                sync_hashtags(post)
                notify_mentions(users[username], content, post)
            if with_images and has_image and not post.image:
                palette = PALETTES[(index * 3) % len(PALETTES)]
                post.image.save(
                    f"seed-{index}.webp",
                    to_content_file(abstract_image(image_rng, (1200, 800), palette), "p.webp"),
                    save=True,
                )
            posts.append(post)
        self.stdout.write(f"Posts: {len(posts)}")

        quote_count = 0
        for username, target_index, content in QUOTES:
            _, created = Post.objects.get_or_create(
                author=users[username], content=content, repost_of=posts[target_index]
            )
            if created:
                quote_count += 1
                quote = Post.objects.get(author=users[username], content=content)
                sync_hashtags(quote)
                Notification.objects.get_or_create(
                    recipient=posts[target_index].author,
                    actor=users[username],
                    verb=Notification.Verb.QUOTE,
                    post=quote,
                )
        repost_count = 0
        for username, target_index in REPOSTS:
            original = posts[target_index]
            if original.author == users[username]:
                continue
            exists = Post.objects.filter(
                NO_IMAGE, author=users[username], repost_of=original, content=""
            ).exists()
            if not exists:
                Post.objects.create(author=users[username], repost_of=original, content="")
                repost_count += 1
                Notification.objects.get_or_create(
                    recipient=original.author,
                    actor=users[username],
                    verb=Notification.Verb.REPOST,
                    post=original,
                )
        self.stdout.write(f"Quotes created: {quote_count}, reposts created: {repost_count}")

        like_count = comment_count = bookmark_count = 0
        for post in posts:
            fans = rng.sample(usernames, k=rng.randint(2, 6))
            for fan in fans:
                if users[fan] != post.author:
                    _, created = PostLike.objects.get_or_create(user=users[fan], post=post)
                    like_count += created
                    if created:
                        Notification.objects.get_or_create(
                            recipient=post.author,
                            actor=users[fan],
                            verb=Notification.Verb.LIKE_POST,
                            post=post,
                        )
            commenters = rng.sample(usernames, k=rng.randint(1, 3))
            for commenter in commenters:
                comment, created = Comment.objects.get_or_create(
                    post=post, author=users[commenter], content=rng.choice(COMMENTS)
                )
                comment_count += created
                if created and users[commenter] != post.author:
                    Notification.objects.get_or_create(
                        recipient=post.author,
                        actor=users[commenter],
                        verb=Notification.Verb.COMMENT,
                        post=post,
                        comment=comment,
                    )
                # Random values are always drawn so the sequence is stable between runs.
                wants_reply, reply_text = rng.random() > 0.5, rng.choice(REPLIES)
                if created and wants_reply and users[commenter] != post.author:
                    reply, created_reply = Comment.objects.get_or_create(
                        post=post, author=post.author, parent=comment, content=reply_text
                    )
                    comment_count += created_reply
                    if created_reply:
                        Notification.objects.get_or_create(
                            recipient=comment.author,
                            actor=post.author,
                            verb=Notification.Verb.REPLY,
                            post=post,
                            comment=reply,
                        )
            for saver in rng.sample(usernames, k=rng.randint(0, 2)):
                _, created = Bookmark.objects.get_or_create(user=users[saver], post=post)
                bookmark_count += created
        self.stdout.write(
            f"Likes created: {like_count}, comments created: {comment_count}, "
            f"bookmarks created: {bookmark_count}"
        )

        # Leave only the three most recent notifications of each user unread.
        for user in users.values():
            recent = Notification.objects.filter(recipient=user).order_by("-created_at", "-id")
            keep_unread = list(recent.values_list("pk", flat=True)[:3])
            recent.exclude(pk__in=keep_unread).update(is_read=True)
        self.stdout.write(f"Notifications: {Notification.objects.count()}")

        self.stdout.write(
            self.style.SUCCESS(f"Done. Log in with any of {', '.join(usernames)} / {DEMO_PASSWORD}")
        )
