import { Router } from 'express';
import { db } from '../db/index.js';
import { income, products, productCategories, salesChannels } from '../db/schema.js';
import { eq, ilike } from 'drizzle-orm';
import { sendDiscordNotification } from '../utils/discord.js';

const router = Router();

router.post('/preorder', async (req, res) => {
  try {
    const order = req.body;
    
    // Validate Security Token
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.WEBHOOK_SECRET_TOKEN) {
      res.status(401).json({ error: 'Unauthorized webhook trigger' });
      return;
    }

    // Validate payload
    if (!order || !order.productName) {
      res.status(400).json({ error: 'Invalid payload' });
      return;
    }

    // 1. Get or Create "Preorder Website" Sales Channel
    let channelId: number;
    const existingChannel = await db.query.salesChannels.findFirst({
      where: ilike(salesChannels.name, 'Preorder Website')
    });

    if (existingChannel) {
      channelId = existingChannel.id;
    } else {
      const [newChannel] = await db.insert(salesChannels).values({
        name: 'Preorder Website'
      }).returning();
      channelId = newChannel.id;
    }

    // 2. Find or Create Product
    let productId: number;
    // We combine the name, color, and size for PetMe's backend, e.g., "Cat Shirt (Red - L)"
    const colorPart = order.color ? ` - ${order.color}` : '';
    const sizePart = order.size ? ` - ${order.size}` : '';
    const fullProductName = `${order.productName}${colorPart}${sizePart}`.trim();
    
    const existingProduct = await db.query.products.findFirst({
      where: ilike(products.name, fullProductName)
    });

    if (existingProduct) {
      productId = existingProduct.id;
    } else {
      // Create product category "Preorder" if not exists
      let categoryId: number | null = null;
      const existingCategory = await db.query.productCategories.findFirst({
        where: ilike(productCategories.name, 'Preorder')
      });
      
      if (existingCategory) {
        categoryId = existingCategory.id;
      } else {
        const [newCategory] = await db.insert(productCategories).values({
          name: 'Preorder',
          slug: 'preorder'
        }).returning();
        categoryId = newCategory.id;
      }

      // Create new product
      const [newProduct] = await db.insert(products).values({
        name: fullProductName,
        categoryId: categoryId,
        baseCost: '0'
      }).returning();
      productId = newProduct.id;
    }

    // 3. Create or Update Income record
    const preorderId = order.id || order.orderId;
    const isShipped = order.status === 'shipped';
    const shouldBeInIncome = ['paid', 'confirmed', 'producing', 'shipped'].includes(order.status);

    let incomeRecord;
    
    if (preorderId) {
      const existingIncome = await db.query.income.findFirst({
        where: eq(income.preorderId, parseInt(preorderId))
      });

      if (existingIncome) {
        // Update existing record
        const updateData: any = { isShipped, orderStatus: order.status || 'unknown' };
        
        if (order.status === 'cancelled' || order.status === 'pending') {
          updateData.isCleared = false;
          updateData.cashFlowStatus = 'pending';
        } else {
          updateData.isCleared = true;
          updateData.cashFlowStatus = 'cleared';
        }

        [incomeRecord] = await db.update(income)
          .set(updateData)
          .where(eq(income.id, existingIncome.id))
          .returning();
          
        res.status(200).json({ success: true, message: 'Preorder updated successfully', data: incomeRecord });
        return;
      }
    }

    if (!shouldBeInIncome) {
      res.status(200).json({ success: true, message: `Preorder ignored because status is ${order.status}` });
      return;
    }

    [incomeRecord] = await db.insert(income).values({
      preorderId: preorderId ? parseInt(preorderId) : null,
      productId,
      channelId,
      quantity: order.quantity || 1,
      fullPrice: order.totalPrice.toString(),
      netAmount: order.totalPrice.toString(),
      cashFlowStatus: 'cleared', // Only triggered when order is paid/confirmed
      isCleared: true,
      isShipped: isShipped,
      orderStatus: order.status || 'unknown',
      saleDate: order.createdAt ? new Date(order.createdAt).toISOString() : new Date().toISOString()
    }).returning();

    // 4. Send Discord Notification
    await sendDiscordNotification({
      title: '🎉 New Preorder Income Logged!',
      description: `An order for **${fullProductName}** was just confirmed and logged.`,
      color: 5814783, // Greenish blue
      fields: [
        {
          name: 'Product',
          value: fullProductName,
          inline: true
        },
        {
          name: 'Quantity',
          value: (order.quantity || 1).toString(),
          inline: true
        },
        {
          name: 'Total Price',
          value: `฿${order.totalPrice.toLocaleString()}`,
          inline: true
        }
      ],
      timestamp: new Date().toISOString()
    });

    res.status(200).json({ success: true, message: 'Preorder mapped to income successfully' });
  } catch (error) {
    console.error('Failed to process preorder webhook:', error);
    res.status(500).json({ error: 'Internal server error processing webhook' });
  }
});

export default router;
