from rest_framework.pagination import CursorPagination, PageNumberPagination


class StandardPagination(PageNumberPagination):
    """Page-number pagination for bounded lists (users, comments, search)."""

    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 50


class TimelineCursorPagination(CursorPagination):
    """Cursor pagination for infinite-scroll timelines (posts, notifications).

    Cursors stay correct while new items are inserted at the top, which
    page numbers cannot guarantee for a live feed. ``-id`` breaks ties
    between rows created in the same instant.
    """

    page_size = 10
    max_page_size = 50
    page_size_query_param = "page_size"
    ordering = ("-created_at", "-id")
