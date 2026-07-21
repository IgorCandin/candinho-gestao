function doGet() {
  return jsonResponse_({
    ok: true,
    service: "Candinho Calendar Bridge",
    message: "Ponte com Google Calendar online."
  });
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents || "{}");

    var properties = PropertiesService.getScriptProperties();
    var secret = properties.getProperty("CANDINHO_SYNC_SECRET");

    if (!secret) {
      return jsonResponse_({
        ok: false,
        error: "CANDINHO_SYNC_SECRET não configurado."
      });
    }

    if (!body.secret || body.secret !== secret) {
      return jsonResponse_({
        ok: false,
        error: "Não autorizado."
      });
    }

    var action = body.action;
    var sourceType = body.source_type;
    var sourceId = body.source_id;

    if (!sourceType || !sourceId) {
      return jsonResponse_({
        ok: false,
        error: "source_type e source_id são obrigatórios."
      });
    }

    var calendar = CalendarApp.getDefaultCalendar();

    var storageKey =
      "CANDINHO_EVENT_" +
      sourceType +
      "_" +
      sourceId;

    var eventId =
      properties.getProperty(storageKey);

    if (action === "delete") {
      if (eventId) {
        var eventToDelete =
          calendar.getEventById(eventId);

        if (eventToDelete) {
          eventToDelete.deleteEvent();
        }

        properties.deleteProperty(storageKey);
      }

      return jsonResponse_({
        ok: true,
        action: "deleted",
        source_type: sourceType,
        source_id: sourceId
      });
    }

    if (action === "upsert") {
      if (!body.title || !body.date) {
        return jsonResponse_({
          ok: false,
          error: "title e date são obrigatórios para upsert."
        });
      }

      var eventDate =
        parseDateOnly_(body.date);

      var description =
        body.description || "";

      var event = null;

      if (eventId) {
        event =
          calendar.getEventById(eventId);
      }

      if (event) {
        event
          .setTitle(body.title)
          .setDescription(description)
          .setAllDayDate(eventDate);

        return jsonResponse_({
          ok: true,
          action: "updated",
          event_id: event.getId(),
          source_type: sourceType,
          source_id: sourceId
        });
      }

      event =
        calendar.createAllDayEvent(
          body.title,
          eventDate
        );

      event
        .setDescription(description)
        .setTag(
          "candinho_source_type",
          sourceType
        )
        .setTag(
          "candinho_source_id",
          sourceId
        );

      properties.setProperty(
        storageKey,
        event.getId()
      );

      return jsonResponse_({
        ok: true,
        action: "created",
        event_id: event.getId(),
        source_type: sourceType,
        source_id: sourceId
      });
    }

    return jsonResponse_({
      ok: false,
      error: "Ação inválida. Use upsert ou delete."
    });

  } catch (error) {
    return jsonResponse_({
      ok: false,
      error:
        error &&
        error.message
          ? error.message
          : String(error)
    });
  }
}

function parseDateOnly_(value) {
  var parts =
    String(value)
      .split("-")
      .map(Number);

  if (parts.length !== 3) {
    throw new Error(
      "Data inválida: " + value
    );
  }

  return new Date(
    parts[0],
    parts[1] - 1,
    parts[2],
    12,
    0,
    0
  );
}

function jsonResponse_(body) {
  return ContentService
    .createTextOutput(
      JSON.stringify(body)
    )
    .setMimeType(
      ContentService.MimeType.JSON
    );
}
