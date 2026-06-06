package handler

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"webconsole/internal/repository"
	"webconsole/internal/service"
)

// SaveHandler serves the save-state endpoints.
type SaveHandler struct{ svc *service.SaveService }

// NewSaveHandler constructs a SaveHandler.
func NewSaveHandler(svc *service.SaveService) *SaveHandler { return &SaveHandler{svc: svc} }

// ListByGame handles GET /saves/game/:gameId.
func (h *SaveHandler) ListByGame(c *gin.Context) {
	saves, err := h.svc.ListByGame(c.Param("gameId"))
	if err != nil {
		fail(c, http.StatusInternalServerError, "internal", err.Error())
		return
	}
	ok(c, http.StatusOK, saves)
}

// Upload handles POST /saves/slot (multipart: gameId, slot, state, screenshot).
func (h *SaveHandler) Upload(c *gin.Context) {
	gameID := c.PostForm("gameId")
	slot, _ := strconv.Atoi(c.PostForm("slot"))
	if gameID == "" {
		fail(c, http.StatusBadRequest, "bad_request", "gameId is required")
		return
	}

	state, err := c.FormFile("state")
	if err != nil {
		fail(c, http.StatusBadRequest, "bad_request", "state file is required")
		return
	}
	// Screenshot is optional.
	screenshot, _ := c.FormFile("screenshot")

	dto, err := h.svc.Save(gameID, slot, state, screenshot)
	if err != nil {
		fail(c, http.StatusInternalServerError, "internal", err.Error())
		return
	}
	ok(c, http.StatusOK, dto)
}

// Download handles GET /saves/download/:saveId (binary state).
func (h *SaveHandler) Download(c *gin.Context) {
	path, filename, err := h.svc.StatePath(c.Param("saveId"))
	if errors.Is(err, repository.ErrNotFound) {
		fail(c, http.StatusNotFound, "not_found", "save not found")
		return
	}
	if err != nil {
		fail(c, http.StatusInternalServerError, "internal", err.Error())
		return
	}
	c.FileAttachment(path, filename)
}

// Delete handles DELETE /saves/:saveId.
func (h *SaveHandler) Delete(c *gin.Context) {
	err := h.svc.Delete(c.Param("saveId"))
	if errors.Is(err, repository.ErrNotFound) {
		fail(c, http.StatusNotFound, "not_found", "save not found")
		return
	}
	if err != nil {
		fail(c, http.StatusInternalServerError, "internal", err.Error())
		return
	}
	ok(c, http.StatusOK, gin.H{"deleted": true})
}
