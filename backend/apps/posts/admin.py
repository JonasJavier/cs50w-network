from django.contrib import admin

from .models import Bookmark, Comment, Hashtag, Post, PostLike


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ["id", "author", "short_content", "repost_of", "created_at"]
    search_fields = ["content", "author__username"]
    list_select_related = ["author", "repost_of"]
    list_filter = [("repost_of", admin.EmptyFieldListFilter)]
    date_hierarchy = "created_at"
    filter_horizontal = ["hashtags"]
    raw_id_fields = ["author", "repost_of"]

    @admin.display(description="content")
    def short_content(self, obj):
        return obj.content[:60] or ("(repost)" if obj.is_repost else "(image)")


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ["id", "author", "post", "parent", "created_at"]
    search_fields = ["content", "author__username"]
    list_select_related = ["author", "post", "parent"]
    raw_id_fields = ["author", "post", "parent"]


@admin.register(PostLike)
class PostLikeAdmin(admin.ModelAdmin):
    list_display = ["user", "post", "created_at"]
    list_select_related = ["user", "post"]
    raw_id_fields = ["user", "post"]


@admin.register(Bookmark)
class BookmarkAdmin(admin.ModelAdmin):
    list_display = ["user", "post", "created_at"]
    list_select_related = ["user", "post"]
    raw_id_fields = ["user", "post"]


@admin.register(Hashtag)
class HashtagAdmin(admin.ModelAdmin):
    list_display = ["name", "created_at"]
    search_fields = ["name"]
