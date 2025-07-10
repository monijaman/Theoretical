package handlers

import (
	"net/http"
	"strconv"

	"auth-module/internal/api/rest"
	"auth-module/internal/dto"
	"auth-module/internal/repository"
	"auth-module/internal/service"

	"github.com/gin-gonic/gin"
)

type CatalogHandler struct {
	svc service.CatalogService
}

func SetupCatalogRoutes(rh *rest.RestHandler) {
	app := rh.App

	// create an instance of user service & inject to handler
	svc := service.CatalogService{
		Repo:   repository.NewCatalogRepository(rh.DB),
		Auth:   rh.Auth,
		Config: rh.Config,
	}
	handler := CatalogHandler{
		svc: svc,
	}

	// public
	// listing products and categories
	app.GET("/products", handler.GetProducts)
	app.GET("/products/:id", handler.GetProduct)
	app.GET("/categories", handler.GetCategories)
	app.GET("/categories/:id", handler.GetCategoryById)

	// private
	// manage products and categories
	selRoutes := app.Group("/seller", rh.Auth.AuthorizeSeller)
	// Categories
	selRoutes.POST("/categories", handler.CreateCategories)
	selRoutes.PATCH("/categories/:id", handler.EditCategory)
	selRoutes.DELETE("/categories/:id", handler.DeleteCategory)

	// Products
	selRoutes.POST("/products", handler.CreateProducts)
	selRoutes.GET("/products", handler.GetProducts)
	selRoutes.GET("/products/:id", handler.GetProduct)
	selRoutes.PUT("/products/:id", handler.EditProduct)
	selRoutes.PATCH("/products/:id", handler.UpdateStock) // update stock
	selRoutes.DELETE("/products/:id", handler.DeleteProduct)
}

func (h CatalogHandler) GetCategories(ctx *gin.Context) {
	cats, err := h.svc.GetCategories()
	if err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	ctx.JSON(http.StatusOK, gin.H{"message": "categories", "data": cats})
}

func (h CatalogHandler) GetCategoryById(ctx *gin.Context) {
	id, _ := strconv.Atoi(ctx.Param("id"))

	cat, err := h.svc.GetCategory(id)
	if err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	ctx.JSON(http.StatusOK, gin.H{"message": "category", "data": cat})
}

func (h CatalogHandler) CreateCategories(ctx *gin.Context) {
	req := dto.CreateCategoryRequest{}

	err := ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "create category request is not valid"})
		return
	}

	err = h.svc.CreateCategory(req)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "category created successfully"})
}

func (h CatalogHandler) EditCategory(ctx *gin.Context) {
	id, _ := strconv.Atoi(ctx.Param("id"))

	req := dto.CreateCategoryRequest{}

	err := ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "update category request is not valid"})
		return
	}

	updatedCat, err := h.svc.EditCategory(id, req)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "edit category", "data": updatedCat})
}

func (h CatalogHandler) DeleteCategory(ctx *gin.Context) {
	id, _ := strconv.Atoi(ctx.Param("id"))
	err := h.svc.DeleteCategory(id)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	ctx.JSON(http.StatusOK, gin.H{"message": "category deleted successfully"})
}

func (h CatalogHandler) CreateProducts(ctx *gin.Context) {
	req := dto.CreateProductRequest{}
	err := ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "create product request is not valid"})
		return
	}

	user := h.svc.Auth.GetCurrentUser(ctx)
	err = h.svc.CreateProduct(req, user)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	ctx.JSON(http.StatusOK, gin.H{"message": "product created successfully"})
}

func (h CatalogHandler) GetProducts(ctx *gin.Context) {
	products, err := h.svc.GetProducts()
	if err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "products", "data": products})
}

func (h CatalogHandler) GetProduct(ctx *gin.Context) {
	id, _ := strconv.Atoi(ctx.Param("id"))

	product, err := h.svc.GetProductById(id)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "product not found"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "product", "data": product})
}

func (h CatalogHandler) EditProduct(ctx *gin.Context) {
	id, _ := strconv.Atoi(ctx.Param("id"))
	req := dto.CreateProductRequest{}
	err := ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "edit product request is not valid"})
		return
	}
	user := h.svc.Auth.GetCurrentUser(ctx)
	product, err := h.svc.EditProduct(id, req, user)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	ctx.JSON(http.StatusOK, gin.H{"message": "edit product", "data": product})
}

func (h CatalogHandler) UpdateStock(ctx *gin.Context) {
	id, _ := strconv.Atoi(ctx.Param("id"))
	req := dto.UpdateStockRequest{}
	err := ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "update stock request is not valid"})
		return
	}

	err = h.svc.UpdateProductStock(id, req.Stock)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "stock updated successfully"})
}

func (h CatalogHandler) DeleteProduct(ctx *gin.Context) {
	id, _ := strconv.Atoi(ctx.Param("id"))
	// need to provide user id to verify ownership
	user := h.svc.Auth.GetCurrentUser(ctx)
	err := h.svc.DeleteProduct(id, user)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "Delete product", "data": "success"})
}
