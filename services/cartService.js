const Cart = require("../models/Cart");

const getCartSummary = async (userId) => {
    const summary = await Cart.aggregate([
        { $match: { userId: String(userId) } },
        {
            $group: {
                _id: null,
                itemCount: { $sum: "$quantity" },
                totalAmount: { $sum: { $multiply: ["$price", "$quantity"] } }
            }
        }
    ]);

    return {
        itemCount: summary[0]?.itemCount || 0,
        totalAmount: summary[0]?.totalAmount || 0
    };
};

module.exports = { getCartSummary };
