exports.getorders = async (req, res) => {
  const owner = req.user._id;
  try {
    const order = await Order.find({ owner: owner }).sort({ date: -1 });
    if (order) {
      return res.status(200).send(order);
    }
    res.status(404).send("No orders found");
  } catch (error) {
    res.status(500).send();
  }
};

exports.checkout_orders = async (req, res) => {
  try {
    const owner = req.user._id;
    let payload = req.body;
    //find cart and user
    let cart = await Cart.findOne({ owner });
    let user = req.user;
    if (cart._id.toString()) {
      // console.log("inside if", cart._id.toString()); //64898833b803461d1ec056a7
      payload = { ...payload, amount: cart.bill, email: user.email };
      const response = await flw.Charge.card(payload);
      // console.log(response);

      if (response.meta.authorization.mode === "pin") {
        let payload2 = payload;
        payload2.authorization = {
          mode: "pin",
          fields: ["pin"],
          pin: 3310,
        };
        const reCallCharge = await flw.Charge.card(payload2);
        const callValidate = await flw.Charge.validate({
          otp: "12345",
          flw_ref: reCallCharge.data.flw_ref,
        });
        if (callValidate.status === "success") {
          const order = await Order.create({
            owner,
            items: cart.items,
            bill: cart.bill,
          });
          //delete cart
          const data = await Cart.findByIdAndDelete({ _id: cart.id });
          return res.status(201).send({ status: "Payment successful", order });
        } else {
          res.status(400).send("payment failed");
        }
      }
      if (response.meta.authorization.mode === "redirect") {
        let url = response.meta.authorization.redirect;
        open(url);
      }

      // console.log(response)
    } else {
      res.status(400).send("No cart found");
    }
  } catch (error) {
    console.log(error);
    res.status(400).send("invalid request");
  }
};
