"""Domain helpers shared by the post & comment views."""

from django.contrib.auth import get_user_model
from django.db.models.functions import Lower

from apps.core.text import extract_hashtags, extract_mentions
from apps.notifications.models import Notification

from .models import Hashtag, Post

User = get_user_model()


def sync_hashtags(post: Post) -> None:
    """Make ``post.hashtags`` match the tags present in its content."""
    names = extract_hashtags(post.content)
    if names:
        Hashtag.objects.bulk_create([Hashtag(name=name) for name in names], ignore_conflicts=True)
        post.hashtags.set(Hashtag.objects.filter(name__in=names))
    else:
        post.hashtags.clear()


def notify_mentions(actor, text: str, post: Post, comment=None, exclude_ids=()) -> None:
    """Create a MENTION notification for every existing user @mentioned in ``text``."""
    usernames = [name.lower() for name in extract_mentions(text)]
    if not usernames:
        return
    mentioned = (
        User.objects.annotate(username_lower=Lower("username"))
        .filter(username_lower__in=usernames, is_active=True)
        .exclude(pk=actor.pk)
        .exclude(pk__in=list(exclude_ids))
    )
    for user in mentioned:
        Notification.objects.get_or_create(
            recipient=user,
            actor=actor,
            verb=Notification.Verb.MENTION,
            post=post,
            comment=comment,
        )


def resolve_original(post: Post) -> Post:
    """Reposting a repost targets the original post."""
    if post.is_repost and post.repost_of_id:
        return post.repost_of
    return post
