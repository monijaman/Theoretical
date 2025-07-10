package service

import (
	"auth-module/config"
	"auth-module/internal/domain"
	"auth-module/internal/dto"
	"auth-module/internal/helper"
	"auth-module/internal/repository"
)

type CatalogService struct {
	Repo   repository.CatalogRepository
	Auth   helper.Auth
	Config config.AppConfig
}

// GetCategories retrieves all categories
func (s *CatalogService) GetCategories() ([]*domain.Category, error) {
	return s.Repo.FindCategories()
}

// GetCategory retrieves a specific category by ID
func (s *CatalogService) GetCategory(id int) (*domain.Category, error) {
	return s.Repo.FindCategoryById(id)
}

// GetProducts retrieves all products
func (s *CatalogService) GetProducts() ([]*domain.Product, error) {
	return s.Repo.FindProducts()
}

// GetProductByID retrieves a specific product by ID
func (s *CatalogService) GetProductByID(id int) (*domain.Product, error) {
	return s.Repo.FindProductById(id)
}

// GetProductById retrieves a specific product by ID (alias for compatibility)
func (s *CatalogService) GetProductById(id int) (*domain.Product, error) {
	return s.GetProductByID(id)
}

// CreateCategory creates a new category from DTO (seller only)
func (s *CatalogService) CreateCategory(req dto.CreateCategoryRequest) error {
	category := &domain.Category{
		Name: req.Name,
		// Note: DTO has fields that don't map to domain Category
		// Using only the Name field that exists in both
	}
	return s.Repo.CreateCategory(category)
}

// EditCategory updates an existing category from DTO (seller only)
func (s *CatalogService) EditCategory(id int, req dto.CreateCategoryRequest) (*domain.Category, error) {
	category := &domain.Category{
		ID:   uint(id),
		Name: req.Name,
	}
	return s.Repo.EditCategory(category)
}

// DeleteCategory deletes a category (seller only)
func (s *CatalogService) DeleteCategory(id int) error {
	return s.Repo.DeleteCategory(id)
}

// CreateProduct creates a new product from DTO (seller only)
func (s *CatalogService) CreateProduct(req dto.CreateProductRequest, user interface{}) error {
	product := &domain.Product{
		Name:        req.Name,
		Description: req.Description,
		Price:       req.Price,
		Stock:       req.Stock,
		CategoryID:  req.CategoryId, // Note: CategoryId with lowercase 'd'
		ImageURL:    req.ImageUrl,
		// Add seller ID if needed
	}
	return s.Repo.CreateProduct(product)
}

// EditProduct updates an existing product from DTO (seller only)
func (s *CatalogService) EditProduct(id int, req dto.CreateProductRequest, user interface{}) (*domain.Product, error) {
	product := &domain.Product{
		ID:          uint(id),
		Name:        req.Name,
		Description: req.Description,
		Price:       req.Price,
		Stock:       req.Stock,
		CategoryID:  req.CategoryId, // Note: CategoryId with lowercase 'd'
		ImageURL:    req.ImageUrl,
	}
	return s.Repo.EditProduct(product)
}

// UpdateProductStock updates product stock
func (s *CatalogService) UpdateProductStock(id int, stock int) error {
	// This would need to be implemented in the repository
	// For now, use EditProduct to update stock
	product, err := s.Repo.FindProductById(id)
	if err != nil {
		return err
	}
	product.Stock = stock
	_, err = s.Repo.EditProduct(product)
	return err
}

// DeleteProduct deletes a product by ID (seller only)
func (s *CatalogService) DeleteProduct(id int, user interface{}) error {
	product, err := s.Repo.FindProductById(id)
	if err != nil {
		return err
	}
	return s.Repo.DeleteProduct(product)
}

// GetSellerProducts retrieves products for a specific seller
func (s *CatalogService) GetSellerProducts(sellerID int) ([]*domain.Product, error) {
	return s.Repo.FindSellerProducts(sellerID)
}
