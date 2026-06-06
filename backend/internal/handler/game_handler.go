package handler

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"webconsole/internal/repository"
	"webconsole/internal/service"
)

// GameHandler serves the game-library endpoints.
type GameHandler struct{ svc *service.GameService }

// NewGameHandler constructs a GameHandler.
func NewGameHandler(svc *service.GameService) *GameHandler { return &GameHandler{svc: svc} }

// List handles GET /games with pagination and filtering.
func (h *GameHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "60"))

	q := repository.GameQuery{
		Platform: c.Query("platform"),
		Search:   c.Query("search"),
		Tag:      c.Query("tag"),
		Sort:     c.Query("sort"),
		Page:     page,
		PageSize: pageSize,
	}

	games, total, err := h.svc.List(q)
	if err != nil {
		fail(c, http.StatusInternalServerError, "internal", err.Error())
		return
	}

	ok(c, http.StatusOK, gin.H{
		"items":    games,
		"total":    total,
		"page":     q.Page,
		"pageSize": q.PageSize,
	})
}

// Get handles GET /games/{id}.
func (h *GameHandler) Get(c *gin.Context) {
	game, err := h.svc.Get(c.Param("id"))
	if errors.Is(err, repository.ErrNotFound) {
		fail(c, http.StatusNotFound, "not_found", "game not found")
		return
	}
	if err != nil {
		fail(c, http.StatusInternalServerError, "internal", err.Error())
		return
	}
	ok(c, http.StatusOK, game)
}

// PlatformStats handles GET /stats/platforms.
func (h *GameHandler) PlatformStats(c *gin.Context) {
	counts, err := h.svc.PlatformCounts()
	if err != nil {
		fail(c, http.StatusInternalServerError, "internal", err.Error())
		return
	}
	ok(c, http.StatusOK, counts)
}

// UpdateMetadata handles PATCH /games/:id.
func (h *GameHandler) UpdateMetadata(c *gin.Context) {
	var patch service.MetadataPatch
	if err := c.ShouldBindJSON(&patch); err != nil {
		fail(c, http.StatusBadRequest, "bad_request", "invalid body")
		return
	}
	game, err := h.svc.UpdateMetadata(c.Param("id"), patch)
	if errors.Is(err, repository.ErrNotFound) {
		fail(c, http.StatusNotFound, "not_found", "game not found")
		return
	}
	if err != nil {
		fail(c, http.StatusInternalServerError, "internal", err.Error())
		return
	}
	ok(c, http.StatusOK, game)
}

// UploadCover handles POST /games/:id/cover (multipart: cover).
func (h *GameHandler) UploadCover(c *gin.Context) {
	file, err := c.FormFile("cover")
	if err != nil {
		fail(c, http.StatusBadRequest, "bad_request", "cover file is required")
		return
	}
	game, err := h.svc.SaveCover(c.Param("id"), file)
	if errors.Is(err, repository.ErrNotFound) {
		fail(c, http.StatusNotFound, "not_found", "game not found")
		return
	}
	if err != nil {
		fail(c, http.StatusInternalServerError, "internal", err.Error())
		return
	}
	ok(c, http.StatusOK, game)
}

// Tags handles GET /tags.
func (h *GameHandler) Tags(c *gin.Context) {
	tags, err := h.svc.Tags()
	if err != nil {
		fail(c, http.StatusInternalServerError, "internal", err.Error())
		return
	}
	ok(c, http.StatusOK, tags)
}
