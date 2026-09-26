"""Helpers to keep the media storage free of orphaned files."""

import logging

from django.db.models import FileField

logger = logging.getLogger(__name__)


def delete_file(field_file) -> None:
    """Delete the file behind a FieldFile, ignoring storage errors."""
    if not field_file or not field_file.name:
        return
    try:
        field_file.storage.delete(field_file.name)
    except Exception:  # pragma: no cover - storage hiccups must never break requests
        logger.warning("Could not delete media file %s", field_file.name, exc_info=True)


def file_field_names(model) -> list[str]:
    return [field.name for field in model._meta.get_fields() if isinstance(field, FileField)]


def delete_replaced_files(sender, instance, **kwargs):
    """pre_save: remove the previous file when a FileField is replaced or cleared."""
    if not instance.pk:
        return
    try:
        previous = sender.objects.only(*file_field_names(sender)).get(pk=instance.pk)
    except sender.DoesNotExist:
        return
    for name in file_field_names(sender):
        old = getattr(previous, name)
        new = getattr(instance, name)
        if old and old.name != (new.name if new else None):
            delete_file(old)


def delete_files_on_delete(sender, instance, **kwargs):
    """post_delete: remove every file owned by the deleted row."""
    for name in file_field_names(sender):
        delete_file(getattr(instance, name))


def register_file_cleanup(model) -> None:
    from django.db.models.signals import post_delete, pre_save

    pre_save.connect(
        delete_replaced_files, sender=model, dispatch_uid=f"cleanup-pre-{model.__name__}"
    )
    post_delete.connect(
        delete_files_on_delete, sender=model, dispatch_uid=f"cleanup-post-{model.__name__}"
    )
