const { useState, useEffect } = React;
const { Account, Databases, Query, ID, Client, Storage, OAuthProvider } = Appwrite;
 
const config = {
    endpoint: 'https://cloud.appwrite.io/v1',
    project: '66db218f0038886a23ee',
    databaseId: '66db28ef0008d0877f4e',
    productsCollectionId: '66db29840027eb3bc43d',
    cartItemsCollectionId: '66db2bc7002a0572d169',
    imagesBucketId: '66db22780025a90dd063'
}
// Initialize Appwrite
const client = new Client();
client
    .setEndpoint(config.endpoint)
    .setProject(config.project);

const account = new Account(client);
const databases = new Databases(client);
const storage = new Storage(client);

// const products = [
//     { id: 1, name: "Saleor Mighty Mug", price: 11.99, image: "img/Mug.png", description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua." },
//     { id: 2, name: "Saleor Reversed T-shirt", price: 29.99, image: "img/T-shirt.png", description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua." },
//     { id: 3, name: "Saleor Beanie", price: 39.99, image: "img/Beanie.png", description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua." },
//     { id: 4, name: "Saleor Grey Hoodie", price: 49.99, image: "img/Hoodie.png", description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua." },
//     { id: 5, name: "Saleor Dimmed Sunnies Sunglasses", price: 59.99, image: "img/Sunglasses.png", description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua." },
//     { id: 6, name: "Saleor Cushion", price: 69.99, image: "img/Cushion.png", description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua." },
// ];

function App() {
    const [products, setProducts] = useState([]);
    const [cartItems, setCartItems] = useState([]);
    const [currentPage, setCurrentPage] = useState('home');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [user, setUser] = useState(null);
    const [unsubscribe, setUnsubscribe] = useState(null);

    useEffect(() => {
        checkAuth();
        const loadProducts = async () => {
            const fetchedProducts = await fetchProducts();
            setProducts(fetchedProducts);
        };
        loadProducts();
    }, []);

    useEffect(() => {
        if (user) {
            subscribeToChanges();
        } else {
            unsubscribeFromChanges();
        }
    }, [user]);

    const checkAuth = async () => {
        try {
            const session = await account.get();
            setUser(session);
            fetchCartItems();
        } catch (error) {
            console.error('Not authenticated', error);
        }
    };

    const subscribeToChanges = () => {
        const unsub = client.subscribe(
            [
                `databases.${config.databaseId}.collections.${config.cartItemsCollectionId}.documents`,
            ],
            (response) => {
                if (response.events.includes('databases.*.collections.*.documents.*')) {
                    fetchCartItems();
                }
            });
        setUnsubscribe(() => unsub);
    };

    const unsubscribeFromChanges = () => {
        if (unsubscribe) {
            unsubscribe();
            setUnsubscribe(null);
        }
    };

    const login = async () => {
        try {
            await account.createOAuth2Session(
                OAuthProvider.Google, // provider
                window.location.href, // redirect here on success
                window.location.href, // redirect here on failure
            );
        } catch (error) {
            console.error('Login failed', error);
        }
    };

    const logout = async () => {
        try {
            await account.deleteSession('current');
            setUser(null);
            setCartItems([]);
        } catch (error) {
            console.error('Logout failed', error);
        }
    };

    const fetchProducts = async () => {
        try {
            const response = await databases.listDocuments(config.databaseId, config.productsCollectionId);
            response?.documents?.forEach(product => {
                product.image = storage.getFileView(config.imagesBucketId, product.image);
            });
            return response.documents;
        } catch (error) {
            console.error('Failed to fetch products', error);
            return [];
        }
    };

    const addToCartDatabase = async (productId) => {
        try {
            const cartItem = cartItems.find(item => item.product?.$id === productId);
            console.log(cartItem);
            if (cartItem) {
                await databases.updateDocument(config.databaseId, config.cartItemsCollectionId, cartItem.$id, {
                    quantity: cartItem.quantity + 1
                });
            } else {
                await databases.createDocument(
                    config.databaseId,
                    config.cartItemsCollectionId,
                    ID.unique(),
                    {
                        product: productId,
                        quantity: 1
                    });
            }
        } catch (error) {
            console.error('Failed to add item to cart', error);
        }
    };

    const fetchCartItems = async (userId) => {
        try {
            const response = await databases.listDocuments(config.databaseId, config.cartItemsCollectionId);
            //return response.documents;
            setCartItems(response.documents);
        } catch (error) {
            console.error('Failed to fetch cart items', error);
            return [];
        }
    };

    const removeFromCartDatabase = async (documentId) => {
        try {
            await databases.deleteDocument(config.databaseId, config.cartItemsCollectionId, documentId);
        } catch (error) {
            console.error('Failed to remove item from cart', error);
        }
    };


    const renderHome = () => (
        <div className="grid grid-cols-3 gap-8 p-8">
            {products.map(product => (
                <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden transition-transform duration-300 hover:scale-105">
                    <img src={product.image} alt={product.name} className="w-full h-90 object-cover" />
                    <div className="p-4">
                        <h2 className="text-xl font-semibold text-gray-800">{product.name}</h2>
                        <p className="text-gray-600 mt-2">${product.price.toFixed(2)}</p>
                        <button
                            onClick={() => { setSelectedProduct(product); setCurrentPage('product') }}
                            className="mt-4 w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors duration-300"
                        >
                            View Details
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderProduct = () => (
        <div className="p-8">
            <button onClick={() => setCurrentPage('home')} className="mb-6 text-blue-600 hover:text-blue-800 transition-colors duration-300">
                ← Back to Products
            </button>
            <div className="flex bg-white rounded-lg shadow-lg overflow-hidden">
                <img src={selectedProduct.image} alt={selectedProduct.name} className="w-1/2 object-cover" />
                <div className="w-1/2 p-8">
                    <h2 className="text-3xl font-bold text-gray-800">{selectedProduct.name}</h2>
                    <p className="text-2xl text-gray-600 mt-4">${selectedProduct.price.toFixed(2)}</p>
                    <p className="mt-4 text-gray-700">{selectedProduct.description}</p>
                    <button
                        onClick={() => addToCartDatabase(selectedProduct.$id)}
                        className="mt-8 w-full bg-green-600 text-white py-3 rounded-md hover:bg-green-700 transition-colors duration-300"
                    >
                        Add to Cart
                    </button>
                </div>
            </div>
        </div>
    );

    const renderCart = () => (
        <div className="p-8">
            <button onClick={() => setCurrentPage('home')} className="mb-6 text-blue-600 hover:text-blue-800 transition-colors duration-300">
                ← Back to Products
            </button>
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Shopping Cart</h2>
                {cartItems.length === 0 ? (
                    <p className="text-gray-600">Your cart is empty.</p>
                ) : (
                    <ul className="divide-y divide-gray-200">
                        {cartItems.map((item) => {
                            const product = item.product;
                            return (
                                <li key={item.$id} className="flex justify-between items-center py-4">
                                    <span className="text-lg text-gray-800">{product.name}</span>
                                    <div>
                                        <span className="text-lg font-semibold text-gray-600 mr-4">x {item.quantity}</span>
                                        <span className="text-lg font-semibold text-gray-600 mr-4">${(product.price * item.quantity).toFixed(2)}</span>
                                        <button
                                            onClick={() => removeFromCartDatabase(item.$id)}
                                            className="text-red-500 hover:text-red-700 transition-colors duration-300"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
                <div className="mt-6 pt-6 border-t border-gray-200">
                    <p className="text-xl font-bold text-gray-800">
                        Total: ${cartItems.reduce((sum, item) => {
                            const product = item.product;
                            return sum + product.price * item.quantity;

                        }, 0).toFixed(2)}
                    </p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-100">
            <header className="bg-gray-800 text-white py-4 px-8 flex justify-between items-center">
                <h1 className="text-2xl font-bold">My E-commerce Store</h1>
                <div className="flex items-center">
                    {user ? (
                        <>
                            <span className="mr-4">Welcome, {user.name}</span>
                            <button
                                onClick={logout}
                                className="bg-red-500 text-white px-4 py-2 rounded-md mr-4 hover:bg-red-600 transition-colors duration-300"
                            >
                                Logout
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={login}
                            className="bg-white text-gray-800 px-4 py-2 rounded-md mr-4 hover:bg-gray-200 transition-colors duration-300"
                        >
                            Google Login
                        </button>
                    )}
                    <button onClick={() => setCurrentPage('cart')} className="text-3xl relative">
                        🛒
                        {cartItems.reduce((sum, item) => sum + item.quantity, 0) > 0 && (
                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                {cartItems.reduce((sum, item) => sum + item.quantity, 0)}
                            </span>
                        )}
                    </button>
                </div>
            </header>
            <main className="container mx-auto mt-8">
                {currentPage === 'home' && renderHome()}
                {currentPage === 'product' && renderProduct()}
                {currentPage === 'cart' && renderCart()}
            </main>
        </div>
    );
}

ReactDOM.render(<App />, document.getElementById('root'));
